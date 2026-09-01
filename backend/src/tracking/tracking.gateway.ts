import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

interface DriverLocationPayload {
  driverId: string;
  tripId?: string;
  lat: number;
  lng: number;
  speedKmh?: number;
  heading?: number;
}

/**
 * Real-time layer for live tracking (customer app "watch my driver", driver
 * app GPS stream, and the admin dashboard's live operational map — spec §9).
 * Rooms:
 *   trip:{tripId}      - customer/admin clients watching one trip
 *   driver:{driverId}  - anyone watching one driver directly
 *   ops:live-map        - admin dashboard, broadcast every location update
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'tracking' })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.query?.token;
      if (!token) throw new Error('missing token');
      const payload = this.jwt.verify(token as string, { secret: this.config.get('JWT_ACCESS_SECRET') });
      (client as any).user = payload;
    } catch {
      this.logger.warn(`Rejecting unauthenticated socket ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  private static readonly ADMIN_ROLES = ['SUPER_ADMIN', 'OPS_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'];
  private static readonly CORPORATE_ROLES = ['CORPORATE_ADMIN', 'CORPORATE_BOOKER', 'CORPORATE_APPROVER'];

  /**
   * Data isolation applies just as much over the socket as over REST (spec §12) — without
   * this, any authenticated socket (any customer, any driver) could join `trip:{anyTripId}`
   * and silently receive another passenger's live GPS feed and trip events.
   */
  private async assertTripAccess(client: Socket, tripId: string): Promise<boolean> {
    const user = (client as any).user;
    if (!user) return false;
    if (TrackingGateway.ADMIN_ROLES.includes(user.role)) return true;

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, include: { booking: true } });
    if (!trip) return false;

    if (TrackingGateway.CORPORATE_ROLES.includes(user.role)) {
      return !!trip.booking.companyId && trip.booking.companyId === user.companyId;
    }
    if (user.role === 'CUSTOMER') {
      return !!trip.booking.customerId && trip.booking.customerId === user.customerId;
    }
    if (user.role === 'DRIVER') {
      return !!trip.driverId && trip.driverId === user.driverId;
    }
    return false;
  }

  @SubscribeMessage('watch:trip')
  async watchTrip(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string }) {
    if (!(await this.assertTripAccess(client, data.tripId))) {
      return { error: "You don't have access to this trip" };
    }
    client.join(`trip:${data.tripId}`);
    return { joined: `trip:${data.tripId}` };
  }

  @SubscribeMessage('watch:live-map')
  watchLiveMap(@ConnectedSocket() client: Socket) {
    // Admin-dashboard clients only — every driver's live location goes through this room.
    const user = (client as any).user;
    if (!user || !TrackingGateway.ADMIN_ROLES.includes(user.role)) {
      return { error: 'Not permitted to watch the live map' };
    }
    client.join('ops:live-map');
    return { joined: 'ops:live-map' };
  }

  @SubscribeMessage('driver:location')
  async onDriverLocation(@ConnectedSocket() client: Socket, @MessageBody() data: DriverLocationPayload) {
    // A driver may only ever publish their own GPS stream — otherwise anyone with a valid
    // socket connection could spoof or vandalize another driver's live position.
    const user = (client as any).user;
    if (!user || user.role !== 'DRIVER' || user.driverId !== data.driverId) {
      return { error: "You can only publish your own driver's location" };
    }

    await this.prisma.driver.update({
      where: { id: data.driverId },
      data: { currentLat: data.lat, currentLng: data.lng, currentLocationAt: new Date() },
    });

    await this.prisma.gpsLocationEvent.create({
      data: {
        driverId: data.driverId,
        tripId: data.tripId,
        lat: data.lat,
        lng: data.lng,
        speedKmh: data.speedKmh,
        heading: data.heading,
      },
    });

    const broadcastPayload = { ...data, recordedAt: new Date().toISOString() };
    if (data.tripId) this.server.to(`trip:${data.tripId}`).emit('trip:location', broadcastPayload);
    this.server.to(`driver:${data.driverId}`).emit('driver:location', broadcastPayload);
    this.server.to('ops:live-map').emit('live-map:update', broadcastPayload);

    return { ack: true };
  }

  /** Called from TripsService/RouteChangesService so watchers get pushed trip-status and route-change events, not just GPS. */
  emitTripEvent(tripId: string, event: string, payload: unknown) {
    this.server.to(`trip:${tripId}`).emit(event, payload);
    this.server.to('ops:live-map').emit(event, { tripId, ...((payload as object) ?? {}) });
  }
}
