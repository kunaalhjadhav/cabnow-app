import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCorporateCompanyDto,
  INVITABLE_CORPORATE_ROLES,
  InviteCorporateUserDto,
  UpdateCorporateCompanyDto,
  UpsertRouteEditConfigDto,
} from './dto/corporate.dto';

@Injectable()
export class CorporateService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCorporateCompanyDto) {
    return this.prisma.corporateCompany.create({ data: { ...dto, status: 'PENDING' } });
  }

  findAll() {
    return this.prisma.corporateCompany.findMany();
  }

  async findOne(id: string) {
    const company = await this.prisma.corporateCompany.findUnique({
      where: { id },
      include: { routeEditConfig: true },
    });
    if (!company) throw new NotFoundException('Corporate company not found');
    return company;
  }

  async update(id: string, dto: UpdateCorporateCompanyDto) {
    await this.findOne(id);
    return this.prisma.corporateCompany.update({ where: { id }, data: dto });
  }

  async approve(id: string) {
    await this.findOne(id);
    return this.prisma.corporateCompany.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  /** Invite a booker/approver/admin into the corporate portal. In production this would email/SMS an invite link; here it provisions the User + CorporateUser directly so the person can log in via OTP. */
  async inviteUser(companyId: string, dto: InviteCorporateUserDto) {
    await this.findOne(companyId);

    // Defense in depth: even though the DTO already restricts `role` to the three corporate
    // roles (see INVITABLE_CORPORATE_ROLES — deliberately NOT the full UserRole enum, since
    // that would let a company admin mint a SUPER_ADMIN account), re-check here in case this
    // method is ever called from somewhere that bypasses the HTTP validation pipe.
    if (!INVITABLE_CORPORATE_ROLES.includes(dto.role as (typeof INVITABLE_CORPORATE_ROLES)[number])) {
      throw new ConflictException('Invalid role for a corporate invite');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { corporateMembership: true },
    });

    if (existingUser) {
      // Never let inviting-by-phone reassign an existing account that isn't already a plain
      // corporate user of THIS company — otherwise Company B could "invite" Company A's booker
      // by phone number and silently move their membership, or attach corporate access to an
      // unrelated DRIVER/VENDOR_ADMIN/SUPER_ADMIN account.
      const membership = existingUser.corporateMembership;
      const isOwnCompanyMember = membership && membership.companyId === companyId;
      const isUnaffiliatedCorporateRole =
        !membership && (INVITABLE_CORPORATE_ROLES as readonly UserRole[]).includes(existingUser.role);
      if (!isOwnCompanyMember && !isUnaffiliatedCorporateRole) {
        throw new ConflictException('This phone number is already associated with a different account');
      }
    }

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: {},
      create: { phone: dto.phone, fullName: dto.fullName, role: dto.role, status: 'ACTIVE' },
    });
    return this.prisma.corporateUser.upsert({
      where: { userId: user.id },
      update: { companyId, role: dto.role, department: dto.department },
      create: { userId: user.id, companyId, role: dto.role, department: dto.department },
    });
  }

  listUsers(companyId: string) {
    return this.prisma.corporateUser.findMany({ where: { companyId }, include: { user: true } });
  }

  /** Admin-configurable route-editing rules per spec §4. Falls back to the platform default (companyId: null) when a company hasn't set its own. */
  async getRouteEditConfig(companyId: string) {
    const specific = await this.prisma.corporateRouteEditConfig.findUnique({ where: { companyId } });
    if (specific) return specific;
    const platformDefault = await this.prisma.corporateRouteEditConfig.findFirst({ where: { companyId: null } });
    return (
      platformDefault ?? {
        routeEditingAllowed: false,
        maxAdditionalStops: 0,
        maxRouteDeviationKm: 0,
        maxAdditionalWaitingMinutes: 0,
        approvalRequired: true,
        approverRole: 'BOOKER',
        additionalChargesAllowed: true,
      }
    );
  }

  async upsertRouteEditConfig(companyId: string | null, dto: UpsertRouteEditConfigDto) {
    if (companyId) {
      await this.findOne(companyId);
      return this.prisma.corporateRouteEditConfig.upsert({
        where: { companyId },
        update: dto,
        create: { companyId, ...dto },
      });
    }
    // Platform default (companyId is null) — Prisma's nullable @unique doesn't support
    // upsert's `where` on a null value, so resolve it manually instead.
    const existingDefault = await this.prisma.corporateRouteEditConfig.findFirst({
      where: { companyId: null },
    });
    if (existingDefault) {
      return this.prisma.corporateRouteEditConfig.update({
        where: { id: existingDefault.id },
        data: dto,
      });
    }
    return this.prisma.corporateRouteEditConfig.create({ data: { companyId: null, ...dto } });
  }

  async billingSummary(companyId: string) {
    const company = await this.findOne(companyId);
    const invoices = await this.prisma.corporateInvoice.findMany({
      where: { companyId },
      orderBy: { periodStart: 'desc' },
    });
    return {
      creditLimit: company.creditLimit,
      creditUsed: company.creditUsed,
      creditAvailable: Number(company.creditLimit) - Number(company.creditUsed),
      invoices,
    };
  }
}
