import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { PrismaService } from '../prisma/prisma.service';

function makeRule(overrides: any) {
  return {
    id: Math.random().toString(36).slice(2),
    basis: 'PERCENTAGE',
    vendorId: null,
    driverId: null,
    categoryId: null,
    companyId: null,
    city: null,
    zone: null,
    packageType: null,
    priority: 0,
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
    ...overrides,
  };
}

describe('CommissionService', () => {
  let service: CommissionService;
  let rules: any[];

  beforeEach(async () => {
    rules = [];
    const prismaMock = {
      commissionRule: {
        findMany: jest.fn(() => Promise.resolve(rules)),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommissionService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get(CommissionService);
  });

  it('matches the worked example from the spec: ₹2,500 fare, 20% commission → ₹500 commission, ₹2,000 payable', async () => {
    rules = [makeRule({ value: 20 })];
    const result = await service.calculateCommission({ vendorId: 'vendor-1' }, 2500);
    expect(result.commissionAmount).toBe(500);
    expect(result.vendorPayable).toBe(2000);
  });

  it('prefers a driver-specific rule over a vendor-specific one', async () => {
    rules = [
      makeRule({ value: 20, vendorId: 'vendor-1' }),
      makeRule({ value: 10, vendorId: 'vendor-1', driverId: 'driver-1' }),
    ];
    const result = await service.calculateCommission({ vendorId: 'vendor-1', driverId: 'driver-1' }, 1000);
    expect(result.commissionAmount).toBe(100);
    expect(result.vendorPayable).toBe(900);
  });

  it('supports a fixed-amount basis', async () => {
    rules = [makeRule({ basis: 'FIXED_AMOUNT', value: 150 })];
    const result = await service.calculateCommission({}, 2000);
    expect(result.commissionAmount).toBe(150);
    expect(result.vendorPayable).toBe(1850);
  });

  it('defaults to zero commission when no rule matches (never silently withholds money)', async () => {
    rules = [];
    const result = await service.calculateCommission({ vendorId: 'vendor-1' }, 1000);
    expect(result.commissionAmount).toBe(0);
    expect(result.vendorPayable).toBe(1000);
  });
});
