import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto, UpdateDriverLocationDto, UploadDriverDocumentDto } from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDriverDto) {
    return this.prisma.driver.create({ data: { ...dto, status: 'PENDING' } });
  }

  findAll(filters: { vendorId?: string; status?: string; isOnline?: boolean }) {
    return this.prisma.driver.findMany({
      where: {
        vendorId: filters.vendorId,
        status: filters.status as any,
        isOnline: filters.isOnline,
      },
      include: { user: true, vehicles: true },
    });
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: { user: true, vehicles: true, documents: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async findByUserId(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found for this user');
    return driver;
  }

  async uploadDocument(driverId: string, dto: UploadDriverDocumentDto) {
    await this.findOne(driverId);
    return this.prisma.driverDocument.create({ data: { driverId, ...dto } });
  }

  async reviewDocument(documentId: string, status: 'APPROVED' | 'REJECTED', reviewerId: string) {
    const doc = await this.prisma.driverDocument.update({
      where: { id: documentId },
      data: { status, reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    // Once every required document is approved, flip the driver's overall KYC status.
    const pending = await this.prisma.driverDocument.count({
      where: { driverId: doc.driverId, status: { not: 'APPROVED' } },
    });
    await this.prisma.driver.update({
      where: { id: doc.driverId },
      data: { kycStatus: pending === 0 ? 'APPROVED' : 'PENDING_REVIEW' },
    });
    return doc;
  }

  async setOnlineStatus(driverId: string, isOnline: boolean) {
    await this.findOne(driverId);
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { isOnline, isAvailable: isOnline },
    });
  }

  async updateLocation(driverId: string, dto: UpdateDriverLocationDto) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { currentLat: dto.lat, currentLng: dto.lng, currentLocationAt: new Date() },
    });
  }

  async approve(id: string) {
    await this.findOne(id);
    return this.prisma.driver.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.driver.update({ where: { id }, data: { status: 'SUSPENDED', isOnline: false, isAvailable: false } });
  }
}
