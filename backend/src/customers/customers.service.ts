import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({ include: { user: true } });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, include: { user: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByUserId(userId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer profile not found');
    return customer;
  }

  async updateAddresses(userId: string, data: { homeAddress?: string; workAddress?: string }) {
    const customer = await this.findByUserId(userId);
    return this.prisma.customer.update({ where: { id: customer.id }, data });
  }

  async updateEmergencyContacts(userId: string, contacts: Array<{ name: string; phone: string }>) {
    const customer = await this.findByUserId(userId);
    return this.prisma.customer.update({ where: { id: customer.id }, data: { emergencyContacts: contacts } });
  }

  async tripHistory(userId: string) {
    const customer = await this.findByUserId(userId);
    return this.prisma.booking.findMany({
      where: { customerId: customer.id },
      include: { trip: true, stops: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
