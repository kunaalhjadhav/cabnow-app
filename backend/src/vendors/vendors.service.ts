import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateVendorDto) {
    return this.prisma.vendor.create({ data: { ...dto, status: 'PENDING' } });
  }

  findAll(status?: string) {
    return this.prisma.vendor.findMany({ where: status ? { status: status as any } : undefined });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { vehicles: true, drivers: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto) {
    await this.findOne(id);
    return this.prisma.vendor.update({ where: { id }, data: dto as any });
  }

  async approve(id: string) {
    await this.findOne(id);
    return this.prisma.vendor.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.vendor.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }
}
