export interface SmsProvider {
  sendSms(toPhone: string, message: string): Promise<{ providerMessageId: string }>;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';
