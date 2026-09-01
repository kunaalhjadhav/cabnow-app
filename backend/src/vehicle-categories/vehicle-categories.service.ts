import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleCategoryDto, UpdateVehicleCategoryDto } from './dto/vehicle-category.dto';

@Injectable()
export class VehicleCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateVehicleCategoryDto) {
    return this.prisma.vehicleCategory.create({ data: dto });
  }

  findAll(activeOnly = false) {
    return this.prisma.vehicleCategory.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.vehicleCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Vehicle category not found');
    return category;
  }

  async update(id: string, dto: UpdateVehicleCategoryDto) {
    await this.findOne(id);
    return this.prisma.vehicleCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicleCategory.update({ where: { id }, data: { isActive: false } });
  }
}
