import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Batches a vendor's completed trips in a period into one payable settlement (spec §5/§11: Vendor Settlements). */
  async generateForVendor(vendorId: string, periodStart: Date, periodEnd: Date) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: periodStart, lte: periodEnd },
        vehicle: { vendorId },
      },
      include: { booking: true },
    });

    if (trips.length === 0) {
      throw new BadRequestException('No completed trips found for this vendor in the given period');
    }

    const earnings = await this.prisma.driverEarning.findMany({
      where: { tripId: { in: trips.map((t) => t.id) }, settlementId: null },
    });
    const earningsByTrip = new Map(earnings.map((e) => [e.tripId, e]));

    const lineItems = trips.map((t) => {
      const fare = Number(t.finalFare ?? 0);
      const payable = Number(earningsByTrip.get(t.id)?.amount ?? fare);
      return { tripId: t.id, fare, commission: Math.round((fare - payable) * 100) / 100, payable };
    });

    const grossAmount = Math.round(lineItems.reduce((s, l) => s + l.fare, 0) * 100) / 100;
    const netPayable = Math.round(lineItems.reduce((s, l) => s + l.payable, 0) * 100) / 100;
    const commissionAmount = Math.round((grossAmount - netPayable) * 100) / 100;

    const settlement = await this.prisma.vendorSettlement.create({
      data: {
        vendorId,
        periodStart,
        periodEnd,
        status: 'PENDING',
        grossAmount,
        commissionAmount,
        netPayable,
        tripCount: trips.length,
        lineItems,
      },
    });

    await this.prisma.driverEarning.updateMany({
      where: { id: { in: earnings.map((e) => e.id) } },
      data: { settlementId: settlement.id },
    });

    return settlement;
  }

  findForVendor(vendorId: string) {
    return this.prisma.vendorSettlement.findMany({ where: { vendorId }, orderBy: { periodStart: 'desc' } });
  }

  async findOne(id: string) {
    const settlement = await this.prisma.vendorSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return settlement;
  }

  async markPaid(id: string, payoutReference: string) {
    await this.findOne(id);
    return this.prisma.vendorSettlement.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), payoutReference },
    });
  }

  async markFailed(id: string) {
    await this.findOne(id);
    return this.prisma.vendorSettlement.update({ where: { id }, data: { status: 'FAILED' } });
  }

  // ---- Driver-facing earnings (spec: Driver App > Earnings / Commission details / Payouts) ----

  async driverEarningsSummary(driverId: string) {
    const [totalCredit, totalDebit, unsettled] = await Promise.all([
      this.prisma.driverEarning.aggregate({ where: { driverId, isCredit: true }, _sum: { amount: true } }),
      this.prisma.driverEarning.aggregate({ where: { driverId, isCredit: false }, _sum: { amount: true } }),
      this.prisma.driverEarning.aggregate({ where: { driverId, settlementId: null }, _sum: { amount: true } }),
    ]);
    return {
      totalEarned: Number(totalCredit._sum.amount ?? 0),
      totalDeductions: Number(totalDebit._sum.amount ?? 0),
      pendingPayout: Number(unsettled._sum.amount ?? 0),
    };
  }

  driverEarningsList(driverId: string) {
    return this.prisma.driverEarning.findMany({ where: { driverId }, orderBy: { createdAt: 'desc' }, take: 200 });
  }
}
