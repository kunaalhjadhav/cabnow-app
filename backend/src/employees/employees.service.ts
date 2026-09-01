import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  create(companyId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({ data: { companyId, ...dto } });
  }

  findAllForCompany(companyId: string) {
    return this.prisma.employee.findMany({ where: { companyId }, orderBy: { fullName: 'asc' } });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: { isActive: false } });
  }

  tripHistory(employeeId: string) {
    return this.prisma.booking.findMany({
      where: { employeeId },
      include: { trip: true, stops: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
