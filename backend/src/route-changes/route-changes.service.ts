import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MapsService } from '../maps/maps.service';
import { PricingService } from '../pricing/pricing.service';
import { CorporateService } from '../corporate/corporate.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { RequestRouteChangeDto } from './dto/route-change.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPS_ADMIN'];
const CORPORATE_ROLES = ['CORPORATE_ADMIN', 'CORPORATE_BOOKER', 'CORPORATE_APPROVER'];

/**
 * Handles in-trip route modifications end-to-end per spec §4:
 *  - reads the admin-configured limits (CorporateRouteEditConfig)
 *  - rejects changes outside those limits
 *  - prices the change with the same configurable pricing engine as the rest of the trip
 *  - routes to an approver when the config requires one
 *  - records the full audit trail (original route, new route, who/when/where, deltas, approval status)
 */
@Injectable()
export class RouteChangesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maps: MapsService,
    private readonly pricing: PricingService,
    private readonly corporate: CorporateService,
    private readonly tracking: TrackingGateway,
  ) {}

  /** Throws unless `requestor` is allowed to see/act on route changes for this trip. */
  private assertTripAccess(requestor: AuthenticatedUser, trip: { driverId: string | null; booking: { companyId: string | null; customerId: string | null } }) {
    if (ADMIN_ROLES.includes(requestor.role)) return;
    if (CORPORATE_ROLES.includes(requestor.role)) {
      if (trip.booking.companyId && trip.booking.companyId === requestor.companyId) return;
      throw new ForbiddenException("You don't have access to this trip");
    }
    if (requestor.role === 'CUSTOMER') {
      if (trip.booking.customerId && trip.booking.customerId === requestor.customerId) return;
      throw new ForbiddenException("You don't have access to this trip");
    }
    if (requestor.role === 'DRIVER') {
      if (trip.driverId && trip.driverId === requestor.driverId) return;
      throw new ForbiddenException("You don't have access to this trip");
    }
    throw new ForbiddenException("You don't have access to this trip");
  }

  async request(tripId: string, requestor: AuthenticatedUser, dto: RequestRouteChangeDto) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { booking: { include: { stops: true } }, stops: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    this.assertTripAccess(requestor, trip);
    const initiatedByUserId = requestor.userId;
    if (!['IN_PROGRESS', 'AT_STOP', 'DRIVER_ARRIVED', 'OTP_VERIFIED'].includes(trip.status)) {
      throw new BadRequestException('Route can only be modified during an active trip');
    }

    // getRouteEditConfig() falls back to the platform default (companyId: null) when a
    // company hasn't set its own config, and to a fully-locked-down default beyond that —
    // so retail (non-corporate) trips only get route editing if Admin explicitly enabled
    // the platform default.
    const effectiveConfig = await this.corporate.getRouteEditConfig(
      trip.booking.companyId ?? '00000000-0000-0000-0000-000000000000',
    );

    if (!effectiveConfig.routeEditingAllowed) {
      throw new ForbiddenException('Route editing is not enabled for this trip');
    }

    const pendingOriginalStops = trip.stops.filter((s) => s.status === 'PENDING');
    const additionalStops = Math.max(0, dto.newStops.length - pendingOriginalStops.length);
    if (additionalStops > effectiveConfig.maxAdditionalStops) {
      throw new BadRequestException(
        `Route change adds ${additionalStops} stop(s), exceeding the allowed maximum of ${effectiveConfig.maxAdditionalStops}`,
      );
    }

    const originalRemainingWaypoints = [
      { lat: dto.changeLat, lng: dto.changeLng },
      ...pendingOriginalStops.map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) })),
      { lat: Number(trip.booking.dropLat), lng: Number(trip.booking.dropLng) },
    ];
    const newRemainingWaypoints = [
      { lat: dto.changeLat, lng: dto.changeLng },
      ...dto.newStops.map((s) => ({ lat: s.lat, lng: s.lng })),
      { lat: Number(trip.booking.dropLat), lng: Number(trip.booking.dropLng) },
    ];

    const [originalEstimate, newEstimate] = await Promise.all([
      this.maps.estimateRoute(originalRemainingWaypoints),
      this.maps.estimateRoute(newRemainingWaypoints),
    ]);

    const additionalDistanceKm = Math.max(0, Math.round((newEstimate.distanceKm - originalEstimate.distanceKm) * 100) / 100);
    const additionalTimeMinutes = Math.max(0, newEstimate.durationMinutes - originalEstimate.durationMinutes);

    if (additionalDistanceKm > Number(effectiveConfig.maxRouteDeviationKm)) {
      throw new BadRequestException(
        `Route change deviates by ${additionalDistanceKm}km, exceeding the allowed maximum of ${effectiveConfig.maxRouteDeviationKm}km`,
      );
    }

    const originalWaitTotal = pendingOriginalStops.reduce((s, x) => s + x.plannedWaitMinutes, 0);
    const newWaitTotal = dto.newStops.reduce((s, x) => s + (x.plannedWaitMinutes ?? 0), 0);
    const additionalWaitingMinutes = Math.max(0, newWaitTotal - originalWaitTotal);

    if (additionalWaitingMinutes > effectiveConfig.maxAdditionalWaitingMinutes) {
      throw new BadRequestException(
        `Route change adds ${additionalWaitingMinutes} minute(s) of waiting, exceeding the allowed maximum of ${effectiveConfig.maxAdditionalWaitingMinutes}`,
      );
    }

    const additionalFare = effectiveConfig.additionalChargesAllowed
      ? await this.pricing.calculateRouteChangeFare(
          { categoryId: trip.booking.categoryId, companyId: trip.booking.companyId },
          additionalDistanceKm,
          additionalStops,
          additionalWaitingMinutes,
        )
      : 0;

    const status = effectiveConfig.approvalRequired ? 'PENDING_APPROVAL' : 'AUTO_APPROVED';

    const routeChange = await this.prisma.routeChange.create({
      data: {
        tripId,
        initiatedByUserId,
        status,
        originalRouteSnapshot: pendingOriginalStops.map((s) => ({ label: s.label, lat: Number(s.lat), lng: Number(s.lng), sequence: s.sequence })),
        newRouteSnapshot: dto.newStops.map((s, i) => ({ label: s.label, lat: s.lat, lng: s.lng, sequence: i + 1 })),
        changeLat: dto.changeLat,
        changeLng: dto.changeLng,
        reason: dto.reason,
        additionalDistanceKm,
        additionalTimeMinutes,
        additionalFare,
        approvalRequired: effectiveConfig.approvalRequired,
        approvedAt: status === 'AUTO_APPROVED' ? new Date() : null,
        resolvedAt: status === 'AUTO_APPROVED' ? new Date() : null,
      },
    });

    if (status === 'AUTO_APPROVED') {
      await this.applyToTrip(tripId, dto.newStops, routeChange.id);
    }

    this.tracking.emitTripEvent(tripId, 'trip:route-change', { routeChangeId: routeChange.id, status });
    return routeChange;
  }

  private async applyToTrip(tripId: string, newStops: RequestRouteChangeDto['newStops'], routeChangeId: string) {
    const existing = await this.prisma.tripStop.findMany({ where: { tripId } });
    const maxSequence = existing.reduce((m, s) => Math.max(m, s.sequence), 0);

    // Stops the passenger already passed are left untouched; anything still PENDING
    // is superseded by the newly-approved list, appended after the current max sequence.
    await this.prisma.tripStop.updateMany({
      where: { tripId, status: 'PENDING' },
      data: { status: 'SKIPPED' },
    });

    await this.prisma.tripStop.createMany({
      data: newStops.map((s, i) => ({
        tripId,
        sequence: maxSequence + i + 1,
        label: s.label,
        lat: s.lat,
        lng: s.lng,
        plannedWaitMinutes: s.plannedWaitMinutes ?? 0,
        addedByRouteChangeId: routeChangeId,
      })),
    });
  }

  async approve(routeChangeId: string, requestor: AuthenticatedUser) {
    const routeChange = await this.prisma.routeChange.findUnique({
      where: { id: routeChangeId },
      include: { trip: { include: { booking: true } } },
    });
    if (!routeChange) throw new NotFoundException('Route change not found');
    this.assertTripAccess(requestor, routeChange.trip);
    if (routeChange.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending route changes can be approved');
    }

    const updated = await this.prisma.routeChange.update({
      where: { id: routeChangeId },
      data: { status: 'APPROVED', approvedByUserId: requestor.userId, approvedAt: new Date(), resolvedAt: new Date() },
    });

    const newStops = (updated.newRouteSnapshot as any[]).map((s) => ({
      label: s.label,
      lat: s.lat,
      lng: s.lng,
      plannedWaitMinutes: s.plannedWaitMinutes ?? 0,
    }));
    await this.applyToTrip(updated.tripId, newStops, updated.id);
    this.tracking.emitTripEvent(updated.tripId, 'trip:route-change', { routeChangeId, status: 'APPROVED' });
    return updated;
  }

  async reject(routeChangeId: string, requestor: AuthenticatedUser, reason?: string) {
    const routeChange = await this.prisma.routeChange.findUnique({
      where: { id: routeChangeId },
      include: { trip: { include: { booking: true } } },
    });
    if (!routeChange) throw new NotFoundException('Route change not found');
    this.assertTripAccess(requestor, routeChange.trip);
    if (routeChange.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending route changes can be rejected');
    }
    const updated = await this.prisma.routeChange.update({
      where: { id: routeChangeId },
      data: { status: 'REJECTED', approvedByUserId: requestor.userId, rejectionReason: reason, resolvedAt: new Date() },
    });
    this.tracking.emitTripEvent(updated.tripId, 'trip:route-change', { routeChangeId, status: 'REJECTED' });
    return updated;
  }

  async findForTrip(tripId: string, requestor: AuthenticatedUser) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, include: { booking: true } });
    if (!trip) throw new NotFoundException('Trip not found');
    this.assertTripAccess(requestor, trip);
    return this.prisma.routeChange.findMany({ where: { tripId }, orderBy: { requestedAt: 'desc' } });
  }

  /**
   * A CORPORATE_ADMIN/APPROVER is always scoped to their own company regardless of what
   * companyId they pass — only SUPER_ADMIN/OPS_ADMIN may see across all companies.
   */
  findPendingApprovals(requestor: AuthenticatedUser, companyId?: string) {
    const scopedCompanyId = ADMIN_ROLES.includes(requestor.role) ? companyId : requestor.companyId;
    if (!ADMIN_ROLES.includes(requestor.role) && !scopedCompanyId) {
      // Non-admin requestor with no resolved company — never fall back to "show everything".
      return Promise.resolve([]);
    }
    return this.prisma.routeChange.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        trip: scopedCompanyId ? { booking: { companyId: scopedCompanyId } } : undefined,
      },
      include: { trip: { include: { booking: true } } },
      orderBy: { requestedAt: 'asc' },
    });
  }
}
