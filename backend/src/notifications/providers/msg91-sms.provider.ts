import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './sms-provider.interface';

/**
 * MSG91-backed SMS/OTP provider — a common choice for Indian phone numbers.
 * Configure MSG91_AUTH_KEY / MSG91_SENDER_ID / MSG91_OTP_TEMPLATE_ID in .env.
 * Uses fetch() (Node 18+) against the MSG91 v5 REST API.
 */
@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  private readonly logger = new Logger(Msg91SmsProvider.name);

  constructor(private readonly config: ConfigService) {}

  async sendSms(toPhone: string, message: string): Promise<{ providerMessageId: string }> {
    const authKey = this.config.get<string>('MSG91_AUTH_KEY');
    const senderId = this.config.get<string>('MSG91_SENDER_ID');

    if (!authKey || authKey.startsWith('your-')) {
      this.logger.log(`[DEV SMS to ${toPhone}] ${message}`);
      return { providerMessageId: `dev-${Date.now()}` };
    }

    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        short_url: '0',
        mobiles: toPhone.replace('+', ''),
        message,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      this.logger.error(`MSG91 send failed: ${JSON.stringify(body)}`);
      throw new Error('Failed to send SMS via MSG91');
    }
    return { providerMessageId: body?.request_id ?? `msg91-${Date.now()}` };
  }
}
