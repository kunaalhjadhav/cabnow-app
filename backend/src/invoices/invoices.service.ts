import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batches every completed corporate-billed trip in a period into one invoice
   * (spec §5 / §12: "Corporate Company → Platform → Vendor/Driver", the company
   * is billed by the platform). Idempotent-ish for non-overlapping periods —
   * a production job would additionally track which trips have been invoiced.
   */
  async generateForCompany(companyId: string, periodStart: Date, periodEnd: Date) {
    const company = await this.prisma.corporateCompany.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Corporate company not found');

    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: periodStart, lte: periodEnd },
        booking: { companyId },
      },
      include: { booking: true, fareBreakdowns: true },
    });

    if (trips.length === 0) {
      throw new BadRequestException('No completed trips found for this company in the given period');
    }

    const lineItems = trips.map((t) => ({
      tripId: t.id,
      bookingId: t.bookingId,
      description: `${t.booking.pickupLabel} → ${t.booking.dropLabel} (${t.completedAt?.toISOString().slice(0, 10)})`,
      amount: Number(t.finalFare ?? 0),
    }));

    const totalAmount = Math.round(lineItems.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const taxAmount = Math.round(
      trips.reduce((s, t) => s + t.fareBreakdowns.filter((f) => f.lineType === 'TAX').reduce((s2, f) => s2 + Number(f.amount), 0), 0) * 100,
    ) / 100;
    const subtotal = Math.round((totalAmount - taxAmount) * 100) / 100;

    const invoiceNumber = `INV-${company.displayName.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase()}-${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 15);

    return this.prisma.corporateInvoice.create({
      data: {
        companyId,
        invoiceNumber,
        status: 'ISSUED',
        periodStart,
        periodEnd,
        subtotal,
        taxAmount,
        totalAmount,
        dueDate,
        issuedAt: new Date(),
        lineItems,
      },
    });
  }

  findForCompany(companyId: string) {
    return this.prisma.corporateInvoice.findMany({ where: { companyId }, orderBy: { periodStart: 'desc' } });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.corporateInvoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async recordPayment(id: string, amount: number) {
    const invoice = await this.findOne(id);
    if (invoice.status === 'VOID') throw new BadRequestException('Cannot record payment against a void invoice');

    const amountPaid = Math.round((Number(invoice.amountPaid) + amount) * 100) / 100;
    const status = amountPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';

    const [updated] = await this.prisma.$transaction([
      this.prisma.corporateInvoice.update({
        where: { id },
        data: { amountPaid, status, paidAt: status === 'PAID' ? new Date() : invoice.paidAt },
      }),
      this.prisma.corporateCompany.update({
        where: { id: invoice.companyId },
        data: { creditUsed: { decrement: amount } },
      }),
    ]);

    return updated;
  }

  async voidInvoice(id: string) {
    await this.findOne(id);
    return this.prisma.corporateInvoice.update({ where: { id }, data: { status: 'VOID' } });
  }
}
