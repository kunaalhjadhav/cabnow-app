import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding vehicle categories...');
  const categories = await Promise.all(
    [
      { name: 'Mini', seatingCapacity: 4, sortOrder: 1 },
      { name: 'Sedan', seatingCapacity: 4, sortOrder: 2 },
      { name: 'SUV', seatingCapacity: 6, sortOrder: 3 },
      { name: 'Luxury', seatingCapacity: 4, sortOrder: 4 },
      { name: 'Corporate XL', seatingCapacity: 7, sortOrder: 5 },
    ].map((c) =>
      prisma.vehicleCategory.upsert({
        where: { name: c.name },
        update: {},
        create: c,
      }),
    ),
  );
  const [mini, sedan, suv, luxury] = categories;

  console.log('Seeding platform-default pricing rules (all city/category/company-agnostic)...');
  const pricingRules: Array<Parameters<typeof prisma.pricingRule.create>[0]['data']> = [
    { name: 'Base fare — Mini', type: 'BASE_FARE', categoryId: mini.id, value: 40, isPercentage: false },
    { name: 'Base fare — Sedan', type: 'BASE_FARE', categoryId: sedan.id, value: 60, isPercentage: false },
    { name: 'Base fare — SUV', type: 'BASE_FARE', categoryId: suv.id, value: 90, isPercentage: false },
    { name: 'Base fare — Luxury', type: 'BASE_FARE', categoryId: luxury.id, value: 150, isPercentage: false },
    { name: 'Per-km — Mini', type: 'PER_KM', categoryId: mini.id, value: 11, isPercentage: false },
    { name: 'Per-km — Sedan', type: 'PER_KM', categoryId: sedan.id, value: 14, isPercentage: false },
    { name: 'Per-km — SUV', type: 'PER_KM', categoryId: suv.id, value: 18, isPercentage: false },
    { name: 'Per-km — Luxury', type: 'PER_KM', categoryId: luxury.id, value: 28, isPercentage: false },
    { name: 'Per-minute (platform default)', type: 'PER_MINUTE', value: 1.5, isPercentage: false },
    { name: 'Minimum fare (platform default)', type: 'MINIMUM_FARE', value: 80, isPercentage: false },
    { name: 'Waiting charge (platform default)', type: 'WAITING_CHARGE', value: 2, isPercentage: false, conditions: { freeMinutes: 5 } },
    { name: 'Extra stop charge (platform default)', type: 'EXTRA_STOP_CHARGE', value: 20, isPercentage: false },
    { name: 'Airport surcharge (platform default)', type: 'AIRPORT_SURCHARGE', value: 75, isPercentage: false },
    { name: 'Night surcharge (platform default)', type: 'NIGHT_SURCHARGE', value: 15, isPercentage: true, conditions: { startHour: 22, endHour: 6 } },
    { name: 'Cancellation fee (platform default)', type: 'CANCELLATION_FEE', value: 50, isPercentage: false },
    { name: 'GST (platform default)', type: 'TAX', value: 5, isPercentage: true },
  ];
  for (const rule of pricingRules) {
    await prisma.pricingRule.create({ data: rule });
  }

  console.log('Seeding platform-default commission rule (20% — matches spec §5 worked example)...');
  await prisma.commissionRule.create({
    data: { name: 'Platform default commission', basis: 'PERCENTAGE', value: 20, priority: 0 },
  });

  console.log('Seeding platform-default corporate route-edit config...');
  const existingRouteEditConfig = await prisma.corporateRouteEditConfig.findFirst({ where: { companyId: null } });
  if (!existingRouteEditConfig) {
    await prisma.corporateRouteEditConfig.create({
      data: {
        companyId: null,
        routeEditingAllowed: true,
        maxAdditionalStops: 2,
        maxRouteDeviationKm: 5,
        maxAdditionalWaitingMinutes: 20,
        approvalRequired: true,
        approverRole: 'BOOKER',
        additionalChargesAllowed: true,
      },
    });
  }

  console.log('Seeding a super admin user (login via OTP against this phone number in dev)...');
  // Must be a pattern-valid phone number (RequestOtpDto's @IsPhoneNumber() validates real
  // country numbering-plan rules via libphonenumber-js, not just "starts with a +") — Indian
  // mobile numbers must start with 6/7/8/9, so an all-zeros placeholder like +910000000001
  // gets rejected by validation before the login request ever reaches the database.
  await prisma.user.upsert({
    where: { phone: '+919000000001' },
    update: {},
    create: {
      phone: '+919000000001',
      fullName: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Seeding a demo vendor + a demo corporate company...');
  const vendor =
    (await prisma.vendor.findFirst({ where: { displayName: 'Demo Fleet' } })) ??
    (await prisma.vendor.create({
      data: {
        legalName: 'Demo Fleet Services Pvt Ltd',
        displayName: 'Demo Fleet',
        contactPhone: '+919000000002',
        status: 'ACTIVE',
        city: 'Bengaluru',
      },
    }));

  const company = await prisma.corporateCompany.findFirst({ where: { displayName: 'Acme Corp' } });
  if (!company) {
    await prisma.corporateCompany.create({
      data: {
        legalName: 'Acme Corporation Pvt Ltd',
        displayName: 'Acme Corp',
        contactEmail: 'ops@acme-demo.example',
        contactPhone: '+919000000003',
        creditLimit: 500000,
        status: 'ACTIVE',
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Demo vendor id: ${vendor.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
