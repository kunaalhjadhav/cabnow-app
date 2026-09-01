import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true, phone: true, email: true, fullName: true, role: true,
        status: true, lastLoginAt: true, createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, phone: true, email: true, fullName: true, role: true,
        status: true, profilePhotoUrl: true, lastLoginAt: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED') {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async updateProfile(id: string, data: { fullName?: string; email?: string; profilePhotoUrl?: string; languagePreference?: string }) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data });
  }

  /** Creates an internal admin/staff account directly (no OTP flow) — used by SUPER_ADMIN to onboard other admins. */
  async createStaffUser(data: { phone: string; fullName: string; email?: string; role: UserRole }) {
    return this.prisma.user.create({ data: { ...data, status: 'ACTIVE' } });
  }
}
