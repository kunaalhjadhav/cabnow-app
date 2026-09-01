import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MapsService } from '../maps/maps.service';

export interface DispatchCandidate {
  driverId: string;
  vehicleId: string;
  distanceKm: number;
  etaMinutes: number;
}

/**
 * Basic nearest-available-driver dispatch engine (spec §8/§9). Looks at
 * online + available drivers, active + approved vehicles matching the
 * requested category, and picks the closest by straight-line distance.
 * This is intentionally simple — it's the seam where a production system
 * would plug in a proper geo-index (PostGIS / Redis geo) and a scoring
 * function (distance, driver rating, idle time, acceptance rate). Phase 5's
 * "AI-assisted dispatch" replaces this function's internals, not its callers.
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly maps: MapsService,
  ) {}

  async findCandidates(categoryId: string, pickup: { lat: number; lng: number }, limit = 5): Promise<DispatchCandidate[]> {
    const drivers = await this.prisma.driver.findMany({
      where: {
        isOnline: true,
        isAvailable: true,
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        currentLat: { not: null },
        currentLng: { not: null },
        vehicles: { some: { categoryId, status: 'ACTIVE' } },
      },
      include: { vehicles: { where: { categoryId, status: 'ACTIVE' }, take: 1 } },
    });

    const candidates: DispatchCandidate[] = drivers
      .filter((d) => d.vehicles.length > 0 && d.currentLat != null && d.currentLng != null)
      .map((d) => {
        const distanceKm = this.maps.distanceBetween(
          { lat: Number(d.currentLat), lng: Number(d.currentLng) },
          pickup,
        );
        const avgCitySpeedKmh = 25;
        return {
          driverId: d.id,
          vehicleId: d.vehicles[0].id,
          distanceKm,
          etaMinutes: Math.max(1, Math.round((distanceKm / avgCitySpeedKmh) * 60)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return candidates;
  }

  async assignNearestDriver(tripId: string, categoryId: string, pickup: { lat: number; lng: number }) {
    const [best] = await this.findCandidates(categoryId, pickup, 1);
    if (!best) {
      this.logger.warn(`No available driver found for trip ${tripId} in category ${categoryId}`);
      return null;
    }

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      this.logger.error(`assignNearestDriver called with unknown tripId ${tripId}`);
      return null;
    }

    await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id: tripId },
        data: {
          driverId: best.driverId,
          vehicleId: best.vehicleId,
          status: 'ASSIGNED',
          driverAssignedAt: new Date(),
        },
      }),
      this.prisma.driver.update({ where: { id: best.driverId }, data: { isAvailable: false } }),
      this.prisma.booking.update({
        where: { id: trip.bookingId },
        data: { status: 'DRIVER_ASSIGNED' },
      }),
    ]);

    return best;
  }
}
