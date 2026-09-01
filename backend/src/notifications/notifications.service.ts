import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SMS_PROVIDER, SmsProvider } from './providers/sms-provider.interface';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
  ) {}

  async sendSms(phone: string, message: string) {
    return this.smsProvider.sendSms(phone, message);
  }

  async notify(userId: string, title: string, body: string, channel: NotificationChannel = 'IN_APP', data: Record<string, unknown> = {}) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, channel, data: data as Prisma.InputJsonValue, sentAt: new Date() },
    });
    // Push (FCM) / email delivery would be dispatched here in production,
    // keyed off FCM_SERVER_KEY / an email provider configured in .env.
    return notification;
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }
}
