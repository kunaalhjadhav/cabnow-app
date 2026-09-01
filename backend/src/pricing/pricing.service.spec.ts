import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';

type MockRule = {
  id: string;
  type: string;
  value: number;
  isPercentage: boolean;
  categoryId: string | null;
  companyId: string | null;
  city: string | null;
  zone: string | null;
  packageType: string | null;
  priority: number;
  updatedAt: Date;
  conditions: Record<string, unknown>;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  isActive: boolean;
};

function makeRule(overrides: Partial<MockRule> & Pick<MockRule, 'type' | 'value'>): MockRule {
  return {
    id: Math.random().toString(36).slice(2),
    isPercentage: false,
    categoryId: null,
    companyId: null,
    city: null,
    zone: null,
    packageType: null,
    priority: 0,
    updatedAt: new Date(),
    conditions: {},
    effectiveFrom: null,
    effectiveTo: null,
    isActive: true,
    ...overrides,
  };
}

describe('PricingService', () => {
  let service: PricingService;
  let rulesByType: Record<string, MockRule[]>;

  beforeEach(async () => {
    rulesByType = {};

    const prismaMock = {
      pricingRule: {
        findMany: jest.fn(({ where }: any) => Promise.resolve(rulesByType[where.type] ?? [])),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(PricingService);
  });

  it('computes base + distance + time with no other rules configured', async () => {
    rulesByType = {
      BASE_FARE: [makeRule({ type: 'BASE_FARE', value: 40 })],
      PER_KM: [makeRule({ type: 'PER_KM', value: 12 })],
      PER_MINUTE: [makeRule({ type: 'PER_MINUTE', value: 2 })],
    };

    const result = await service.calculateFare({
      categoryId: 'cat-mini',
      distanceKm: 10,
      durationMinutes: 20,
    });

    // 40 base + (12 * 10) distance + (2 * 20) time = 40 + 120 + 40 = 200
    expect(result.total).toBe(200);
  });

  it('prefers the most specific rule (category+company) over the platform default', async () => {
    rulesByType = {
      BASE_FARE: [
        makeRule({ type: 'BASE_FARE', value: 40 }), // platform default
        makeRule({ type: 'BASE_FARE', value: 55, categoryId: 'cat-suv' }), // category-specific
        makeRule({ type: 'BASE_FARE', value: 70, categoryId: 'cat-suv', companyId: 'company-1' }), // most specific
      ],
      PER_KM: [],
      PER_MINUTE: [],
    };

    const result = await service.calculateFare({
      categoryId: 'cat-suv',
      companyId: 'company-1',
      distanceKm: 0,
      durationMinutes: 0,
    });

    expect(result.total).toBe(70);
  });

  it('applies a minimum-fare floor when the computed subtotal is below it', async () => {
    rulesByType = {
      BASE_FARE: [makeRule({ type: 'BASE_FARE', value: 10 })],
      PER_KM: [],
      PER_MINUTE: [],
      MINIMUM_FARE: [makeRule({ type: 'MINIMUM_FARE', value: 80 })],
    };

    const result = await service.calculateFare({ categoryId: 'cat-mini', distanceKm: 1, durationMinutes: 1 });
    expect(result.total).toBe(80);
  });

  it('applies a percentage tax on top of the subtotal', async () => {
    rulesByType = {
      BASE_FARE: [makeRule({ type: 'BASE_FARE', value: 100 })],
      PER_KM: [],
      PER_MINUTE: [],
      TAX: [makeRule({ type: 'TAX', value: 5, isPercentage: true })],
    };

    const result = await service.calculateFare({ categoryId: 'cat-mini', distanceKm: 0, durationMinutes: 0 });
    expect(result.total).toBe(105);
  });

  it('short-circuits distance/time pricing for a corporate package flat fare', async () => {
    rulesByType = {
      BASE_FARE: [makeRule({ type: 'BASE_FARE', value: 999 })],
      PER_KM: [makeRule({ type: 'PER_KM', value: 999 })],
      PER_MINUTE: [],
    };

    const result = await service.calculateFare({
      categoryId: 'cat-mini',
      distanceKm: 50,
      durationMinutes: 60,
      packageFlatFare: 1200,
    });

    expect(result.total).toBe(1200);
    expect(result.lines.find((l) => l.lineType === 'PACKAGE_FARE')?.amount).toBe(1200);
  });
});
