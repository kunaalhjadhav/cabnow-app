import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { CommissionService } from '../commission/commission.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { CompleteTripDto, RateTripDto } from './dto/trip-actions.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPS_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'];
const CORPORATE_ROLES = ['CORPORATE_ADMIN', 'CORPORATE_BOOKER', 'CORPORATE_APPROVER'];

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly commission: CommissionService,
    private readonly tracking: TrackingGateway,
  ) {}

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        booking: true,
        driver: { include: { user: true } },
        vehicle: true,
        stops: true,
        routeChanges: true,
        payments: true,
        fareBreakdowns: true,
        ratings: true,
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async findOneScoped(id: string, requestor: AuthenticatedUser) {
    const trip = await this.findOne(id);
    this.assertTripAccess(requestor, trip);
    return trip;
  }

  /** Throws unless `requestor` is allowed to see/act on this trip (spec §12 data isolation). */
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

  /** A DRIVER may only ever progress a trip that was actually dispatched to them. */
  private async assertOwnDriverTrip(requestor: AuthenticatedUser, tripId: string) {
    const trip = await this.findOne(tripId);
    if (!trip.driverId || trip.driverId !== requestor.driverId) {
      throw new ForbiddenException("You don't have access to this trip");
    }
    return trip;
  }

  findForDriver(driverId: string, status?: string) {
    return this.prisma.trip.findMany({
      where: { driverId, status: status as any },
      include: { booking: true, stops: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async setStatus(id: string, status: string, extra: Record<string, unknown> = {}) {
    const trip = await this.prisma.trip.update({ where: { id }, data: { status: status as any, ...extra } });
    this.tracking.emitTripEvent(id, 'trip:status', { status });
    return trip;
  }

  async markDriverArriving(id: string, requestor: AuthenticatedUser) {
    const trip = await this.assertOwnDriverTrip(requestor, id);
    if (trip.status !== 'ASSIGNED') throw new BadRequestException('Trip is not in ASSIGNED state');
    return this.setStatus(id, 'DRIVER_ARRIVING');
  }

  async markDriverArrived(id: string, requestor: AuthenticatedUser) {
    const trip = await this.assertOwnDriverTrip(requestor, id);
    if (!['ASSIGNED', 'DRIVER_ARRIVING'].includes(trip.status)) {
      throw new BadRequestException('Trip is not in a state where the driver can arrive');
    }
    return this.setStatus(id, 'DRIVER_ARRIVED', { arrivedAtPickupAt: new Date() });
  }

  async verifyOtp(id: string, code: string, requestor: AuthenticatedUser) {
    const trip = await this.assertOwnDriverTrip(requestor, id);
    if (trip.status !== 'DRIVER_ARRIVED') {
      throw new BadRequestException('Driver must be at the pickup location before OTP verification');
    }
    if (!trip.otpCode || trip.otpCode !== code) {
      throw new BadRequestException('Incorrect OTP');
    }
    return this.setStatus(id, 'OTP_VERIFIED', { otpVerifiedAt: new Date() });
  }

  async startTrip(id: string, requestor: AuthenticatedUser) {
    const trip = await this.assertOwnDriverTrip(requestor, id);
    if (trip.status !== 'OTP_VERIFIED') {
      throw new BadRequestException('OTP must be verified before starting the trip');
    }
    // Booking.status stays at DRIVER_ASSIGNED for the live-trip window — Trip.status
    // (IN_PROGRESS, AT_STOP, ...) is the source of truth for in-trip lifecycle; Booking
    // only advances again on completion/cancellation.
    return this.setStatus(id, 'IN_PROGRESS', { startedAt: new Date() });
  }

  async arriveAtStop(tripId: string, tripStopId: string, requestor: AuthenticatedUser) {
    await this.assertOwnDriverTrip(requestor, tripId);
    const stop = await this.prisma.tripStop.findUnique({ where: { id: tripStopId } });
    if (!stop || stop.tripId !== tripId) throw new NotFoundException('Trip stop not found');
    await this.prisma.tripStop.update({ where: { id: tripStopId }, data: { status: 'ARRIVED', arrivedAt: new Date() } });
    return this.setStatus(tripId, 'AT_STOP');
  }

  async departStop(tripId: string, tripStopId: string, requestor: AuthenticatedUser) {
    await this.assertOwnDriverTrip(requestor, tripId);
    const stop = await this.prisma.tripStop.findUnique({ where: { id: tripStopId } });
    if (!stop || stop.tripId !== tripId) throw new NotFoundException('Trip stop not found');
    const actualWaitMinutes = stop.arrivedAt
      ? Math.max(0, Math.round((Date.now() - stop.arrivedAt.getTime()) / 60000))
      : 0;
    await this.prisma.tripStop.update({
      where: { id: tripStopId },
      data: { status: 'DEPARTED', departedAt: new Date(), actualWaitMinutes },
    });
    return this.setStatus(tripId, 'IN_PROGRESS');
  }

  async completeTrip(id: string, dto: CompleteTripDto, requestor: AuthenticatedUser) {
    if (requestor.role === 'DRIVER') {
      await this.assertOwnDriverTrip(requestor, id);
    }
    const trip = await this.findOne(id);
    if (!['IN_PROGRESS', 'AT_STOP'].includes(trip.status)) {
      throw new BadRequestException('Trip must be in progress to complete');
    }

    const booking = trip.booking;
    const distanceKm = dto.actualDistanceKm ?? Number(booking.estimatedDistanceKm ?? 0);
    const durationMinutes = dto.actualDurationMinutes ?? booking.estimatedDurationMinutes ?? 0;
    const waitingMinutes = trip.stops.reduce((sum, s) => sum + (s.actualWaitMinutes ?? s.plannedWaitMinutes ?? 0), 0);
    const pkg = booking.packageId ? await this.prisma.package.findUnique({ where: { id: booking.packageId } }) : null;

    const fare = await this.pricing.calculateFare({
      categoryId: booking.categoryId,
      companyId: booking.companyId,
      packageType: pkg?.packageType,
      packageFlatFare: pkg?.flatFare != null ? Number(pkg.flatFare) : null,
      distanceKm,
      durationMinutes,
      waitingMinutes,
      extraStops: trip.stops.length,
      tollAmount: dto.tollAmount,
      parkingAmount: dto.parkingAmount,
    });

    const approvedRouteChangeFare = trip.routeChanges
      .filter((rc) => rc.status === 'APPROVED' || rc.status === 'AUTO_APPROVED')
      .reduce((sum, rc) => sum + Number(rc.additionalFare), 0);

    const finalFare = Math.round((fare.total + approvedRouteChangeFare) * 100) / 100;

    await this.prisma.$transaction(async (tx) => {
      await tx.fareBreakdown.createMany({
        data: fare.lines.map((l) => ({ tripId: id, lineType: l.lineType, label: l.label, amount: l.amount, meta: (l.meta ?? {}) as Prisma.InputJsonValue })),
      });
      if (approvedRouteChangeFare !== 0) {
        await tx.fareBreakdown.create({
          data: { tripId: id, lineType: 'ROUTE_CHANGE_ADJUSTMENT', label: 'Approved route changes', amount: approvedRouteChangeFare },
        });
      }
      await tx.trip.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actualDistanceKm: distanceKm,
          actualDurationMinutes: durationMinutes,
          finalFare,
          polyline: dto.polyline,
        },
      });
      await tx.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED' } });
      if (trip.driverId) {
        await tx.driver.update({ where: { id: trip.driverId }, data: { isAvailable: true, totalTrips: { increment: 1 } } });
      }
      if (booking.companyId) {
        await tx.corporateCompany.update({
          where: { id: booking.companyId },
          data: { creditUsed: { increment: finalFare } },
        });
      }
      await tx.payment.create({
        data: {
          tripId: id,
          method: booking.companyId ? 'CORPORATE_BILLING' : (dto.paymentMethod ?? 'UPI'),
          status: booking.companyId ? 'CAPTURED' : 'PENDING',
          amount: finalFare,
        },
      });
    });

    // Commission + driver earning (spec §5) — computed after commit so it reads the final fare cleanly.
    if (trip.driverId && trip.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: trip.vehicleId } });
      const result = await this.commission.calculateCommission(
        {
          vendorId: vehicle?.vendorId,
          driverId: trip.driverId,
          categoryId: booking.categoryId,
          companyId: booking.companyId,
          packageType: pkg?.packageType,
        },
        finalFare,
      );
      await this.prisma.driverEarning.create({
        data: {
          driverId: trip.driverId,
          tripId: id,
          description: `Trip earning (${result.ruleName}: fare ₹${finalFare} − commission ₹${result.commissionAmount})`,
          amount: result.vendorPayable,
          isCredit: true,
        },
      });
    }

    this.tracking.emitTripEvent(id, 'trip:completed', { finalFare });
    return this.findOne(id);
  }

  async rate(tripId: string, requestor: AuthenticatedUser, dto: RateTripDto) {
    const trip = await this.findOne(tripId);
    this.assertTripAccess(requestor, trip);
    if (trip.status !== 'COMPLETED') throw new BadRequestException('Can only rate a completed trip');

    const rating = await this.prisma.rating.create({
      data: { tripId, ratedByUserId: requestor.userId, ratedUserId: dto.ratedUserId, score: dto.score, comment: dto.comment },
    });

    if (trip.driverId) {
      const driverUser = await this.prisma.driver.findUnique({ where: { id: trip.driverId } });
      if (driverUser && driverUser.userId === dto.ratedUserId) {
        const agg = await this.prisma.rating.aggregate({
          where: { ratedUserId: dto.ratedUserId },
          _avg: { score: true },
        });
        await this.prisma.driver.update({
          where: { id: trip.driverId },
          data: { rating: agg._avg.score ?? 5 },
        });
      }
    }

    return rating;
  }
}
