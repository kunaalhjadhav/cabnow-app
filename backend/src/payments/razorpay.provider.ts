import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
// The razorpay package exports its class via plain `module.exports = Razorpay`
// (no `.default`). With esModuleInterop off, a default import (`import Razorpay
// from 'razorpay'`) compiles to `razorpay_1.default`, which is undefined here —
// hence "razorpay_1.default is not a constructor". The `= require(...)` form
// binds directly to module.exports regardless of the interop setting.
import Razorpay = require('razorpay');

/**
 * Thin wrapper around the Razorpay SDK. Configure RAZORPAY_KEY_ID /
 * RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET in .env — see .env.example.
 * Falls back to a mock order id when no keys are configured so the rest of
 * the API is exercisable in dev without a live Razorpay account.
 */
@Injectable()
export class RazorpayProvider {
  private readonly logger = new Logger(RazorpayProvider.name);
  private client: Razorpay | null = null;

  constructor(private readonly config: ConfigService) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (keyId && keySecret && !keyId.startsWith('your-')) {
      this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    } else {
      this.logger.warn('Razorpay credentials not configured — orders will be mocked. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env for production.');
    }
  }

  async createOrder(amountInRupees: number, receipt: string, currency = 'INR') {
    if (!this.client) {
      return { id: `order_mock_${Date.now()}`, amount: Math.round(amountInRupees * 100), currency, receipt };
    }
    return this.client.orders.create({ amount: Math.round(amountInRupees * 100), currency, receipt });
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret || secret.startsWith('your-')) return true; // dev mode — skip verification
    const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret || secret.startsWith('your-')) return true; // dev mode — skip verification
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
  }

  async refund(paymentId: string, amountInRupees?: number) {
    if (!this.client) {
      return { id: `rfnd_mock_${Date.now()}`, amount: amountInRupees ? Math.round(amountInRupees * 100) : undefined };
    }
    // Razorpay's SDK requires an options object even for a full refund (an empty one is valid —
    // omitting `amount` means "refund the full captured amount").
    return this.client.payments.refund(paymentId, amountInRupees ? { amount: Math.round(amountInRupees * 100) } : {});
  }
}
