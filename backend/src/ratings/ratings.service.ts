import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  forUser(userId: string) {
    return this.prisma.rating.findMany({
      where: { ratedUserId: userId },
      include: { trip: { include: { booking: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  forTrip(tripId: string) {
    return this.prisma.rating.findMany({ where: { tripId } });
  }
}
