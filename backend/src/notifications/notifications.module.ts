import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SMS_PROVIDER } from './providers/sms-provider.interface';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { Msg91SmsProvider } from './providers/msg91-sms.provider';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    TwilioSmsProvider,
    Msg91SmsProvider,
    {
      provide: SMS_PROVIDER,
      useFactory: (config: ConfigService, twilio: TwilioSmsProvider, msg91: Msg91SmsProvider) => {
        return config.get<string>('SMS_PROVIDER') === 'msg91' ? msg91 : twilio;
      },
      inject: [ConfigService, TwilioSmsProvider, Msg91SmsProvider],
    },
  ],
  exports: [NotificationsService, SMS_PROVIDER],
})
export class NotificationsModule {}
