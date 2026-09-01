import { Injectable, NotFoundException } from '@nestjs/common';
import { CommissionRule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionRuleDto, UpdateCommissionRuleDto } from './dto/commission-rule.dto';

export interface CommissionContext {
  vendorId?: string | null;
  driverId?: string | null;
  categoryId?: string | null;
  companyId?: string | null;
  city?: string | null;
  zone?: string | null;
  packageType?: string | null;
}

export interface CommissionResult {
  ruleId: string | null;
  ruleName: string;
  basis: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE';
  value: number;
  commissionAmount: number;
  vendorPayable: number;
}

/**
 * Configurable commission engine (spec §5). Admin can define commission by
 * percentage or fixed amount, scoped to any combination of vehicle category,
 * vendor, driver, corporate contract, city/zone and package type. The most
 * specific active rule wins; if nothing matches, commission is zero (so an
 * unconfigured platform doesn't silently withhold money from vendors).
 *
 * Example from spec §5: final fare ₹2,500, a 20% rule scoped to that vendor
 * → commissionAmount = ₹500, vendorPayable = ₹2,000.
 */
@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCommissionRuleDto) {
    return this.prisma.commissionRule.create({
      data: {
        ...dto,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
  }

  findAll(filters: { vendorId?: string; driverId?: string; companyId?: string }) {
    return this.prisma.commissionRule.findMany({
      where: { vendorId: filters.vendorId, driverId: filters.driverId, companyId: filters.companyId },
      orderBy: { priority: 'desc' },
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Commission rule not found');
    return rule;
  }

  async update(id: string, dto: UpdateCommissionRuleDto) {
    await this.findOne(id);
    return this.prisma.commissionRule.update({
      where: { id },
      data: {
        ...dto,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.commissionRule.update({ where: { id }, data: { isActive: false } });
  }

  private scopeClause<K extends string>(field: K, ctxValue: string | null | undefined) {
    return ctxValue ? { OR: [{ [field]: null }, { [field]: ctxValue }] } : { [field]: null };
  }

  private async findBestRule(ctx: CommissionContext, at: Date): Promise<CommissionRule | null> {
    const candidates = await this.prisma.commissionRule.findMany({
      where: {
        isActive: true,
        AND: [
          this.scopeClause('vendorId', ctx.vendorId),
          this.scopeClause('driverId', ctx.driverId),
          this.scopeClause('categoryId', ctx.categoryId),
          this.scopeClause('companyId', ctx.companyId),
          this.scopeClause('city', ctx.city),
          this.scopeClause('zone', ctx.zone),
          this.scopeClause('packageType', ctx.packageType),
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }] },
        ],
      },
    });

    if (candidates.length === 0) return null;

    // Driver-specific rules win over vendor-specific, which win over
    // category/company/city/zone/package-scoped, which win over the platform default.
    const score = (r: CommissionRule) =>
      Number(!!r.driverId) * 10 +
      Number(!!r.vendorId) * 5 +
      Number(!!r.companyId) +
      Number(!!r.categoryId) +
      Number(!!r.city) +
      Number(!!r.zone) +
      Number(!!r.packageType);

    return candidates.sort((a, b) => score(b) - score(a) || b.priority - a.priority)[0];
  }

  async calculateCommission(ctx: CommissionContext, finalFare: number, at: Date = new Date()): Promise<CommissionResult> {
    const rule = await this.findBestRule(ctx, at);

    if (!rule) {
      return { ruleId: null, ruleName: 'No commission rule configured', basis: 'NONE', value: 0, commissionAmount: 0, vendorPayable: finalFare };
    }

    const value = Number(rule.value);
    const commissionAmount =
      rule.basis === 'PERCENTAGE' ? Math.round(((finalFare * value) / 100) * 100) / 100 : Math.min(value, finalFare);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      basis: rule.basis,
      value,
      commissionAmount,
      vendorPayable: Math.round((finalFare - commissionAmount) * 100) / 100,
    };
  }
}
