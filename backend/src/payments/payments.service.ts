import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayProvider } from './razorpay.provider';
import { VerifyRazorpayPaymentDto } from './dto/payment.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPS_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'];

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayProvider,
  ) {}

  findForTrip(tripId: string) {
    return this.prisma.payment.findMany({ where: { tripId }, orderBy: { createdAt: 'desc' } });
  }

  async createOrder(paymentId: string, requestor: AuthenticatedUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { trip: { include: { booking: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    // Only the passenger (or corporate booker/admin whose company owns the trip) may create a
    // checkout order for this payment — otherwise anyone could probe/spam arbitrary paymentIds.
    if (!ADMIN_ROLES.includes(requestor.role)) {
      const booking = payment.trip.booking;
      const ownsAsCustomer = requestor.role === 'CUSTOMER' && booking.customerId && booking.customerId === requestor.customerId;
      const ownsAsCorporate = ['CORPORATE_ADMIN', 'CORPORATE_BOOKER', 'CORPORATE_APPROVER'].includes(requestor.role) && booking.companyId && booking.companyId === requestor.companyId;
      if (!ownsAsCustomer && !ownsAsCorporate) {
        throw new ForbiddenException("You don't have access to this payment");
      }
    }
    if (payment.status === 'CAPTURED') throw new BadRequestException('Payment already captured');

    const order = await this.razorpay.createOrder(Number(payment.amount), payment.id);
    await this.prisma.payment.update({ where: { id: paymentId }, data: { razorpayOrderId: order.id } });
    return { orderId: order.id, amount: Number(payment.amount), currency: payment.currency, paymentId: payment.id };
  }

  async verifyAndCapture(dto: VerifyRazorpayPaymentDto) {
    const payment = await this.prisma.payment.findFirst({ where: { razorpayOrderId: dto.razorpayOrderId } });
    if (!payment) throw new NotFoundException('Payment not found for this order');

    const valid = this.razorpay.verifySignature(dto.razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature);
    if (!valid) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: 'Signature verification failed' },
      });
      throw new BadRequestException('Payment signature verification failed');
    }

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CAPTURED',
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
      },
    });
  }

  /** Razorpay server-to-server webhook — the source of truth for payment state, independent of the client confirming. */
  async handleWebhook(rawBody: string, signature: string, payload: any) {
    const valid = this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) throw new BadRequestException('Invalid webhook signature');

    const event = payload?.event;
    const entity = payload?.payload?.payment?.entity;
    if (!entity) return { received: true };

    const payment = await this.prisma.payment.findFirst({ where: { razorpayOrderId: entity.order_id } });
    if (!payment) return { received: true };

    if (event === 'payment.captured') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'CAPTURED', razorpayPaymentId: entity.id },
      });
    } else if (event === 'payment.failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: entity.error_description ?? 'Payment failed' },
      });
    }
    return { received: true };
  }

  async refund(paymentId: string, amount?: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'CAPTURED') throw new BadRequestException('Only a captured payment can be refunded');

    await this.razorpay.refund(payment.razorpayPaymentId ?? payment.id, amount);
    const refundedAmount = amount ?? Number(payment.amount);
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: refundedAmount >= Number(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAmount,
      },
    });
  }
}
