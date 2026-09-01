import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({ data: { ...dto, status: 'PENDING_APPROVAL' } });
  }

  findAll(filters: { vendorId?: string; status?: string; categoryId?: string }) {
    return this.prisma.vehicle.findMany({
      where: {
        vendorId: filters.vendorId,
        status: filters.status as any,
        categoryId: filters.categoryId,
      },
      include: { category: true },
    });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { category: true, drivers: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  /** Admin approval gate — a vehicle cannot go ACTIVE (and therefore cannot be dispatched) without this. Spec §6. */
  async approve(id: string, approvedByUserId: string) {
    await this.findOne(id);
    return this.prisma.vehicle.update({
      where: { id },
      data: { status: 'ACTIVE', approvedBy: approvedByUserId, approvedAt: new Date() },
    });
  }

  async reject(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: { status } });
  }

  async assignDriver(vehicleId: string, driverId: string) {
    await this.findOne(vehicleId);
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { drivers: { connect: { id: driverId } } },
    });
  }
}
