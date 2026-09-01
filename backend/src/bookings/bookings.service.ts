import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { MapsService } from '../maps/maps.service';
import { PricingService } from '../pricing/pricing.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateNumericOtp } from '../common/utils/hash.util';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maps: MapsService,
    private readonly pricing: PricingService,
    private readonly dispatch: DispatchService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateBookingDto, requestor: AuthenticatedUser) {
    // The client-supplied customerId/companyId/employeeId must never be trusted as-is: without
    // this, a CUSTOMER could attribute a ride to someone else's account, or — far worse — a
    // CORPORATE_BOOKER could pass a different company's id and have THAT company's credit line
    // billed for their ride (spec: Corporate Company -> Platform -> Vendor billing flow). Scope
    // every identity field server-side from the requestor's own JWT claims instead.
    if (requestor.role === 'CUSTOMER') {
      dto.customerId = requestor.customerId;
      dto.companyId = undefined;
      dto.employeeId = undefined;
    } else if (BookingsService.CORPORATE_ROLES.includes(requestor.role)) {
      dto.companyId = requestor.companyId;
      dto.customerId = undefined;
      if (dto.employeeId) {
        const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
        if (!employee || employee.companyId !== requestor.companyId) {
          throw new BadRequestException('Unknown employee for this company');
        }
      }
    } else if (!BookingsService.ADMIN_ROLES.includes(requestor.role)) {
      // DRIVER / VENDOR_ADMIN have no business creating bookings.
      throw new ForbiddenException('Not permitted to create bookings');
    }
    // Admin roles pass dto.customerId/companyId/employeeId through unscoped — they're
    // allowed to book on behalf of any customer or company (support/ops tooling).

    const category = await this.prisma.vehicleCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Unknown vehicle category');

    let pkg: { id: string; packageType: string; flatFare: any } | null = null;
    if (dto.packageId) {
      pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId } });
      if (!pkg) throw new BadRequestException('Unknown package');
    }

    const stops = dto.stops ?? [];
    const waypoints = [dto.pickup, ...stops, dto.drop];
    const route = await this.maps.estimateRoute(waypoints);
    const totalWaitMinutes = stops.reduce((s, st) => s + (st.plannedWaitMinutes ?? 0), 0);

    const fare = await this.pricing.calculateFare({
      categoryId: dto.categoryId,
      companyId: dto.companyId,
      city: dto.city,
      zone: dto.zone,
      packageType: pkg?.packageType,
      packageFlatFare: pkg?.flatFare != null ? Number(pkg.flatFare) : null,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      waitingMinutes: totalWaitMinutes,
      extraStops: stops.length,
      discountCode: dto.discountCode,
      pickupAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
    });

    // Corporate bookings made by a BOOKER (not an admin) go through the
    // portal's approval workflow (spec: "Corporate Portal > Approval workflow").
    // Admins and customers booking for themselves never need approval.
    const approvalRequired = dto.type === 'CORPORATE_PACKAGE' && requestor.role === 'CORPORATE_BOOKER';

    const booking = await this.prisma.booking.create({
      data: {
        source: dto.source,
        type: dto.type,
        status: approvalRequired ? 'PENDING_APPROVAL' : 'CONFIRMED',
        customerId: dto.customerId,
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        bookedByUserId: requestor.userId,
        packageId: dto.packageId,
        categoryId: dto.categoryId,
        pickupLabel: dto.pickup.label,
        pickupLat: dto.pickup.lat,
        pickupLng: dto.pickup.lng,
        dropLabel: dto.drop.label,
        dropLat: dto.drop.lat,
        dropLng: dto.drop.lng,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        passengerName: dto.passengerName,
        passengerPhone: dto.passengerPhone,
        specialInstructions: dto.specialInstructions,
        estimatedDistanceKm: route.distanceKm,
        estimatedDurationMinutes: route.durationMinutes,
        estimatedFare: fare.total,
        approvalRequired,
        stops: {
          create: stops.map((s, i) => ({
            sequence: i + 1,
            label: s.label,
            lat: s.lat,
            lng: s.lng,
            plannedWaitMinutes: s.plannedWaitMinutes ?? 0,
          })),
        },
        fareBreakdowns: {
          create: fare.lines.map((l) => ({ lineType: l.lineType, label: l.label, amount: l.amount, meta: (l.meta ?? {}) as Prisma.InputJsonValue })),
        },
      },
      include: { stops: true, fareBreakdowns: true },
    });

    if (!approvalRequired && dto.type === 'IMMEDIATE') {
      await this.confirmAndDispatch(booking.id);
    }

    return this.findOne(booking.id);
  }

  private static readonly ADMIN_ROLES = ['SUPER_ADMIN', 'OPS_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'];
  private static readonly CORPORATE_ROLES = ['CORPORATE_ADMIN', 'CORPORATE_BOOKER', 'CORPORATE_APPROVER'];

  /**
   * Scopes list filters server-side by role (spec §12: company-level data
   * isolation) rather than trusting whatever customerId/companyId the client
   * passed in — a customer or corporate booker can only ever see their own
   * bookings no matter what query params they send.
   */
  async findAll(requestor: AuthenticatedUser, filters: { customerId?: string; companyId?: string; status?: string }) {
    const scoped = { ...filters };
    if (BookingsService.CORPORATE_ROLES.includes(requestor.role)) {
      scoped.customerId = undefined;
      scoped.companyId = requestor.companyId;
    } else if (requestor.role === 'CUSTOMER') {
      scoped.companyId = undefined;
      scoped.customerId = requestor.customerId;
    } else if (!BookingsService.ADMIN_ROLES.includes(requestor.role)) {
      // Any other role (e.g. DRIVER) has no business listing bookings this way.
      throw new ForbiddenException('Not permitted to list bookings');
    }
    // Admin roles pass filters through unscoped — they're allowed to see everything.

    return this.prisma.booking.findMany({
      where: { customerId: scoped.customerId, companyId: scoped.companyId, status: scoped.status as any },
      include: { stops: true, trip: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { stops: true, trip: { include: { driver: true, vehicle: true, stops: true } }, fareBreakdowns: true, category: true, package: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findOneScoped(id: string, requestor: AuthenticatedUser) {
    const booking = await this.findOne(id);
    this.assertBookingAccess(requestor, booking);
    return booking;
  }

  /** Throws unless `requestor` is allowed to see/act on this booking. */
  private assertBookingAccess(requestor: AuthenticatedUser, booking: Awaited<ReturnType<BookingsService['findOne']>>) {
    if (BookingsService.ADMIN_ROLES.includes(requestor.role)) return;
    if (BookingsService.CORPORATE_ROLES.includes(requestor.role)) {
      if (booking.companyId && booking.companyId === requestor.companyId) return;
      throw new ForbiddenException("You don't have access to this booking");
    }
    if (requestor.role === 'CUSTOMER') {
      if (booking.customerId && booking.customerId === requestor.customerId) return;
      throw new ForbiddenException("You don't have access to this booking");
    }
    if (requestor.role === 'DRIVER') {
      if (booking.trip?.driverId && booking.trip.driverId === requestor.driverId) return;
      throw new ForbiddenException("You don't have access to this booking");
    }
    throw new ForbiddenException("You don't have access to this booking");
  }

  async approve(id: string, requestor: AuthenticatedUser) {
    const booking = await this.findOne(id);
    this.assertBookingAccess(requestor, booking);
    if (booking.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only bookings pending approval can be approved');
    }
    await this.prisma.booking.update({
      where: { id },
      data: { status: 'CONFIRMED', approvedByUserId: requestor.userId, approvedAt: new Date() },
    });
    if (booking.type === 'IMMEDIATE') {
      await this.confirmAndDispatch(id);
    }
    return this.findOne(id);
  }

  async reject(id: string, requestor: AuthenticatedUser, reason?: string) {
    const booking = await this.findOne(id);
    this.assertBookingAccess(requestor, booking);
    if (booking.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only bookings pending approval can be rejected');
    }
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledByUserId: requestor.userId,
        cancelledAt: new Date(),
        cancellationReason: reason ?? 'Rejected during approval',
      },
    });
  }

  /** Creates the Trip row and hands off to the dispatch engine to find a driver (spec §8 booking flow). */
  async confirmAndDispatch(bookingId: string) {
    const booking = await this.findOne(bookingId);
    if (booking.status !== 'CONFIRMED') return booking;

    const existingTrip = await this.prisma.trip.findUnique({ where: { bookingId } });
    if (existingTrip) return booking;

    await this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({ data: { bookingId, status: 'ASSIGNED' } });
      await tx.tripStop.createMany({
        data: booking.stops.map((s) => ({
          tripId: trip.id,
          bookingStopId: s.id,
          sequence: s.sequence,
          label: s.label,
          lat: s.lat,
          lng: s.lng,
          plannedWaitMinutes: s.plannedWaitMinutes,
        })),
      });
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'DISPATCHING' } });
    });

    const trip = await this.prisma.trip.findUnique({ where: { bookingId } });
    const assigned = await this.dispatch.assignNearestDriver(trip!.id, booking.categoryId, {
      lat: Number(booking.pickupLat),
      lng: Number(booking.pickupLng),
    });

    if (!assigned) {
      // Left in DISPATCHING; a background retry job would re-attempt this in production.
      return this.findOne(bookingId);
    }

    const otpCode = generateNumericOtp(4);
    await this.prisma.trip.update({ where: { id: trip!.id }, data: { otpCode } });

    if (booking.passengerPhone) {
      await this.notifications.sendSms(
        booking.passengerPhone,
        `Your driver is on the way. Share OTP ${otpCode} with the driver at pickup to start your trip.`,
      );
    }

    return this.findOne(bookingId);
  }

  async cancel(id: string, requestor: AuthenticatedUser, dto: CancelBookingDto) {
    const booking = await this.findOne(id);
    this.assertBookingAccess(requestor, booking);
    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw new BadRequestException('Booking is already finished or cancelled');
    }

    let cancellationFee = 0;
    if (booking.trip && booking.trip.status !== 'ASSIGNED') {
      // Once a driver has started arriving, cancellation may carry a configurable fee.
      cancellationFee = await this.pricing.calculateCancellationFee({
        categoryId: booking.categoryId,
        companyId: booking.companyId,
        city: undefined,
        zone: undefined,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledByUserId: requestor.userId,
          cancellationReason: dto.reason,
        },
      });
      if (booking.trip) {
        await tx.trip.update({
          where: { id: booking.trip.id },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledByUserId: requestor.userId, cancellationReason: dto.reason },
        });
        if (booking.trip.driverId) {
          await tx.driver.update({ where: { id: booking.trip.driverId }, data: { isAvailable: true } });
        }
        if (cancellationFee > 0) {
          await tx.fareBreakdown.create({
            data: { tripId: booking.trip.id, lineType: 'CANCELLATION_FEE', label: 'Cancellation fee', amount: cancellationFee },
          });
        }
      }
    });

    return this.findOne(id);
  }
}
