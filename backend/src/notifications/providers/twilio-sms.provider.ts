import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { SmsProvider } from './sms-provider.interface';

/**
 * Twilio-backed SMS/OTP provider. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 * and TWILIO_FROM_NUMBER in your .env — see .env.example.
 */
@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private client: Twilio | null = null;

  constructor(private readonly config: ConfigService) {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (sid && token && !sid.startsWith('your-')) {
      this.client = new Twilio(sid, token);
    } else {
      this.logger.warn(
        'Twilio credentials not configured — SMS will be logged to the console instead of sent. ' +
          'Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER in .env for production.',
      );
    }
  }

  async sendSms(toPhone: string, message: string): Promise<{ providerMessageId: string }> {
    if (!this.client) {
      this.logger.log(`[DEV SMS to ${toPhone}] ${message}`);
      return { providerMessageId: `dev-${Date.now()}` };
    }
    const from = this.config.get<string>('TWILIO_FROM_NUMBER');
    const result = await this.client.messages.create({ to: toPhone, from, body: message });
    return { providerMessageId: result.sid };
  }
}
