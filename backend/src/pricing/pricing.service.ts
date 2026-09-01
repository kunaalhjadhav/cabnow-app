import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PricingRule, PricingRuleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePricingRuleDto, UpdatePricingRuleDto } from './dto/pricing-rule.dto';
import { FareCalculationInput, FareCalculationResult, FareLine } from './pricing.types';

/**
 * Configurable pricing engine (spec §10 / §14: "pricing must be configurable
 * from Admin, never hard-coded"). Every fare component below is resolved by
 * looking up PricingRule rows rather than using literals in code, so ops can
 * change base fares, per-km rates, surcharges, taxes etc. per city/zone/
 * vehicle category/corporate contract without a deploy.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Rule CRUD (admin-configurable) -----------------------------------

  create(dto: CreatePricingRuleDto) {
    // Built explicitly (not `...dto`) — spreading a DTO with several optional string fields
    // straight into Prisma's `data` confuses its CreateInput/UncheckedCreateInput XOR inference.
    const data: Prisma.PricingRuleUncheckedCreateInput = {
      name: dto.name,
      type: dto.type,
      categoryId: dto.categoryId,
      companyId: dto.companyId,
      city: dto.city,
      zone: dto.zone,
      packageType: dto.packageType,
      value: dto.value,
      isPercentage: dto.isPercentage,
      conditions: dto.conditions as Prisma.InputJsonValue | undefined,
      priority: dto.priority,
      isActive: dto.isActive,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    };
    return this.prisma.pricingRule.create({ data });
  }

  findAll(filters: { type?: PricingRuleType; categoryId?: string; companyId?: string; city?: string }) {
    return this.prisma.pricingRule.findMany({
      where: {
        type: filters.type,
        categoryId: filters.categoryId,
        companyId: filters.companyId,
        city: filters.city,
      },
      orderBy: [{ type: 'asc' }, { priority: 'desc' }],
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    return rule;
  }

  async update(id: string, dto: UpdatePricingRuleDto) {
    await this.findOne(id);
    const data: Prisma.PricingRuleUncheckedUpdateInput = {
      name: dto.name,
      value: dto.value,
      isPercentage: dto.isPercentage,
      conditions: dto.conditions as Prisma.InputJsonValue | undefined,
      priority: dto.priority,
      isActive: dto.isActive,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    };
    return this.prisma.pricingRule.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.pricingRule.update({ where: { id }, data: { isActive: false } });
  }

  // ---- Fare calculation ---------------------------------------------------

  /**
   * Builds a Prisma OR clause for a nullable scoping field: rows scoped to `null`
   * (platform-wide) always match; rows scoped to a specific value only match when
   * the current context actually has that value. This must NOT collapse to `{}`
   * when the context value is missing, or a corporate-specific rule would leak
   * into non-corporate bookings.
   */
  private scopeClause<K extends string>(field: K, ctxValue: string | null | undefined) {
    return ctxValue ? { OR: [{ [field]: null }, { [field]: ctxValue }] } : { [field]: null };
  }

  /** Resolves the single most specific active rule of a given type for the current context. */
  private async findBestRule(type: PricingRuleType, ctx: FareCalculationInput, at: Date): Promise<PricingRule | null> {
    const candidates = await this.prisma.pricingRule.findMany({
      where: {
        type,
        isActive: true,
        AND: [
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

    // Specificity: prefer rules that pin down more of (category/company/city/zone/packageType),
    // then higher priority, then most recently updated.
    const score = (r: PricingRule) =>
      Number(!!r.categoryId) + Number(!!r.companyId) + Number(!!r.city) + Number(!!r.zone) + Number(!!r.packageType);

    return candidates.sort((a, b) => score(b) - score(a) || b.priority - a.priority || (b.updatedAt.getTime() - a.updatedAt.getTime()))[0];
  }

  private ruleAmount(rule: PricingRule | null, base: number): number {
    if (!rule) return 0;
    const value = Number(rule.value);
    return rule.isPercentage ? (base * value) / 100 : value;
  }

  async calculateFare(input: FareCalculationInput): Promise<FareCalculationResult> {
    const at = input.pickupAt ?? new Date();
    const lines: FareLine[] = [];

    // Corporate package flat fare short-circuits distance/time pricing entirely,
    // but surcharges/tax/discount rules can still apply on top if configured.
    if (input.packageFlatFare != null) {
      lines.push({ lineType: 'PACKAGE_FARE', label: 'Package fare', amount: input.packageFlatFare });
    } else {
      const [baseRule, perKmRule, perMinRule] = await Promise.all([
        this.findBestRule('BASE_FARE', input, at),
        this.findBestRule('PER_KM', input, at),
        this.findBestRule('PER_MINUTE', input, at),
      ]);

      lines.push({ lineType: 'BASE_FARE', label: baseRule?.name ?? 'Base fare', amount: this.ruleAmount(baseRule, 0) });
      lines.push({
        lineType: 'DISTANCE',
        label: perKmRule?.name ?? 'Distance charge',
        amount: this.ruleAmount(perKmRule, 0) * input.distanceKm,
        meta: { distanceKm: input.distanceKm, ratePerKm: perKmRule ? Number(perKmRule.value) : 0 },
      });
      lines.push({
        lineType: 'TIME',
        label: perMinRule?.name ?? 'Time charge',
        amount: this.ruleAmount(perMinRule, 0) * input.durationMinutes,
        meta: { durationMinutes: input.durationMinutes, ratePerMinute: perMinRule ? Number(perMinRule.value) : 0 },
      });
    }

    // Waiting charge — rules may define a free-minutes grace period in `conditions.freeMinutes`.
    if (input.waitingMinutes && input.waitingMinutes > 0) {
      const waitingRule = await this.findBestRule('WAITING_CHARGE', input, at);
      const freeMinutes = Number((waitingRule?.conditions as any)?.freeMinutes ?? 0);
      const chargeableMinutes = Math.max(0, input.waitingMinutes - freeMinutes);
      if (chargeableMinutes > 0) {
        lines.push({
          lineType: 'WAITING',
          label: waitingRule?.name ?? 'Waiting charge',
          amount: this.ruleAmount(waitingRule, 0) * chargeableMinutes,
          meta: { waitingMinutes: input.waitingMinutes, freeMinutes, chargeableMinutes },
        });
      }
    }

    if (input.extraStops && input.extraStops > 0) {
      const extraStopRule = await this.findBestRule('EXTRA_STOP_CHARGE', input, at);
      lines.push({
        lineType: 'EXTRA_STOP',
        label: extraStopRule?.name ?? 'Extra stop charge',
        amount: this.ruleAmount(extraStopRule, 0) * input.extraStops,
        meta: { extraStops: input.extraStops },
      });
    }

    if (input.tollAmount) {
      lines.push({ lineType: 'TOLL', label: 'Toll', amount: input.tollAmount });
    }
    if (input.parkingAmount) {
      lines.push({ lineType: 'PARKING', label: 'Parking', amount: input.parkingAmount });
    }

    if (input.isAirportPickupOrDrop) {
      const airportRule = await this.findBestRule('AIRPORT_SURCHARGE', input, at);
      if (airportRule) {
        lines.push({ lineType: 'AIRPORT_SURCHARGE', label: airportRule.name, amount: this.ruleAmount(airportRule, 0) });
      }
    }

    const nightRule = await this.findBestRule('NIGHT_SURCHARGE', input, at);
    if (nightRule) {
      const startHour = Number((nightRule.conditions as any)?.startHour ?? 22);
      const endHour = Number((nightRule.conditions as any)?.endHour ?? 6);
      const hour = at.getHours();
      const inWindow = startHour <= endHour ? hour >= startHour && hour < endHour : hour >= startHour || hour < endHour;
      if (inWindow) {
        const subtotalSoFar = lines.reduce((s, l) => s + l.amount, 0);
        lines.push({ lineType: 'NIGHT_SURCHARGE', label: nightRule.name, amount: this.ruleAmount(nightRule, subtotalSoFar) });
      }
    }

    const surgeRule = await this.findBestRule('SURGE', input, at);
    const surgeMultiplier = input.surgeMultiplier ?? Number((surgeRule?.conditions as any)?.multiplier ?? 1);
    if (surgeMultiplier && surgeMultiplier > 1) {
      const subtotalSoFar = lines.reduce((s, l) => s + l.amount, 0);
      lines.push({
        lineType: 'SURGE',
        label: surgeRule?.name ?? 'Surge pricing',
        amount: subtotalSoFar * (surgeMultiplier - 1),
        meta: { surgeMultiplier },
      });
    }

    // Minimum fare floor (applies before tax/discount).
    const minFareRule = await this.findBestRule('MINIMUM_FARE', input, at);
    if (minFareRule) {
      const subtotal = lines.reduce((s, l) => s + l.amount, 0);
      const floor = Number(minFareRule.value);
      if (subtotal < floor) {
        lines.push({ lineType: 'ROUNDING', label: 'Minimum fare top-up', amount: floor - subtotal });
      }
    }

    if (input.discountCode) {
      const discountRule = await this.findBestRule('DISCOUNT', input, at);
      if (discountRule) {
        const subtotalSoFar = lines.reduce((s, l) => s + l.amount, 0);
        lines.push({
          lineType: 'DISCOUNT',
          label: discountRule.name,
          amount: -Math.abs(this.ruleAmount(discountRule, subtotalSoFar)),
          meta: { discountCode: input.discountCode },
        });
      }
    }

    const taxRule = await this.findBestRule('TAX', input, at);
    if (taxRule) {
      const taxableSubtotal = lines.reduce((s, l) => s + l.amount, 0);
      lines.push({ lineType: 'TAX', label: taxRule.name, amount: this.ruleAmount(taxRule, taxableSubtotal) });
    }

    const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    return { lines, total };
  }

  async calculateCancellationFee(input: Pick<FareCalculationInput, 'categoryId' | 'companyId' | 'city' | 'zone'>): Promise<number> {
    const rule = await this.findBestRule('CANCELLATION_FEE', { ...input, distanceKm: 0, durationMinutes: 0 }, new Date());
    return this.ruleAmount(rule, 0);
  }

  /**
   * Priced impact of a mid-trip route change (spec §4: "additional distance,
   * additional time, additional fare"). Reuses the same PER_KM / EXTRA_STOP_CHARGE
   * / WAITING_CHARGE rules as the main fare so a route change is priced
   * consistently with the rest of the trip, rather than a separate hard-coded rate.
   */
  async calculateRouteChangeFare(
    ctx: Pick<FareCalculationInput, 'categoryId' | 'companyId' | 'city' | 'zone' | 'packageType'>,
    deviationKm: number,
    additionalStops: number,
    additionalWaitingMinutes: number,
  ): Promise<number> {
    const at = new Date();
    const [perKmRule, extraStopRule, waitingRule] = await Promise.all([
      this.findBestRule('PER_KM', ctx as FareCalculationInput, at),
      this.findBestRule('EXTRA_STOP_CHARGE', ctx as FareCalculationInput, at),
      this.findBestRule('WAITING_CHARGE', ctx as FareCalculationInput, at),
    ]);

    const distanceCharge = Math.max(0, deviationKm) * this.ruleAmount(perKmRule, 0);
    const stopCharge = Math.max(0, additionalStops) * this.ruleAmount(extraStopRule, 0);
    const waitCharge = Math.max(0, additionalWaitingMinutes) * this.ruleAmount(waitingRule, 0);

    return Math.round((distanceCharge + stopCharge + waitCharge) * 100) / 100;
  }
}
