import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateNumericOtp, sha256 } from '../common/utils/hash.util';
import { RequestOtpDto } from './dto/request-otp.dto';
import { SELF_SIGNUP_ROLES, VerifyOtpDto } from './dto/verify-otp.dto';

const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const otpLength = this.config.get<number>('OTP_LENGTH', 6);
    const expirySeconds = this.config.get<number>('OTP_EXPIRY_SECONDS', 300);

    const code = generateNumericOtp(Number(otpLength));
    const expiresAt = new Date(Date.now() + Number(expirySeconds) * 1000);
    const existingUser = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

    await this.prisma.otpCode.create({
      data: {
        userId: existingUser?.id,
        phone: dto.phone,
        codeHash: sha256(code),
        purpose: dto.purpose ?? 'LOGIN',
        expiresAt,
      },
    });

    await this.notifications.sendSms(
      dto.phone,
      `Your Cab Platform verification code is ${code}. It expires in ${Math.round(Number(expirySeconds) / 60)} minutes. Do not share this code.`,
    );

    return { message: 'OTP sent', expiresInSeconds: Number(expirySeconds) };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: { phone: dto.phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('No active OTP for this number. Request a new one.');
    }
    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired. Request a new one.');
    }
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException('Too many incorrect attempts. Request a new OTP.');
    }
    if (otpRecord.codeHash !== sha256(dto.code)) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

    if (!user) {
      // First successful OTP verification for this phone number = signup.
      // Defense in depth: even though VerifyOtpDto already restricts `role` to
      // SELF_SIGNUP_ROLES at the HTTP layer, re-check here since this is a @Public()
      // endpoint — anyone who owns a phone number can reach it, so a role outside
      // {CUSTOMER, DRIVER} must never be honoured this way. Every staff/vendor/corporate
      // role is provisioned only by an authenticated admin via its own endpoint.
      const requestedRole = dto.role ?? UserRole.CUSTOMER;
      if (!(SELF_SIGNUP_ROLES as readonly UserRole[]).includes(requestedRole)) {
        throw new ForbiddenException('This role cannot self-register');
      }
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          fullName: dto.fullName ?? 'New User',
          role: requestedRole,
          status: 'ACTIVE',
        },
      });

      if (user.role === UserRole.CUSTOMER) {
        await this.prisma.customer.create({ data: { userId: user.id } });
      }
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), status: user.status === 'PENDING' ? 'ACTIVE' : user.status },
      });
    }

    return this.issueTokens(user.id, user.phone, user.role);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash, revokedAt: null },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Rotate: revoke the used refresh token, issue a fresh pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.phone, user.role);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out' };
  }

  private async issueTokens(userId: string, phone: string, role: UserRole) {
    const extra = await this.resolveScopedIds(userId, role);

    const payload = { sub: userId, userId, phone, role, ...extra };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
    const refreshToken = this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      },
    );

    const refreshExpiresInDays = this.parseDaysFromExpiry(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    );
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, phone, role, ...extra },
    };
  }

  /** Attaches companyId / vendorId to the JWT so downstream guards can enforce data isolation without extra queries. */
  private async resolveScopedIds(userId: string, role: UserRole) {
    if (role === UserRole.CORPORATE_ADMIN || role === UserRole.CORPORATE_BOOKER || role === UserRole.CORPORATE_APPROVER) {
      const membership = await this.prisma.corporateUser.findUnique({ where: { userId } });
      return { companyId: membership?.companyId };
    }
    if (role === UserRole.VENDOR_ADMIN) {
      const membership = await this.prisma.vendorUser.findUnique({ where: { userId } });
      return { vendorId: membership?.vendorId };
    }
    if (role === UserRole.DRIVER) {
      const driver = await this.prisma.driver.findUnique({ where: { userId } });
      return { driverId: driver?.id, vendorId: driver?.vendorId ?? undefined };
    }
    if (role === UserRole.CUSTOMER) {
      const customer = await this.prisma.customer.findUnique({ where: { userId } });
      return { customerId: customer?.id };
    }
    return {};
  }

  private parseDaysFromExpiry(expr: string): number {
    const match = /^(\d+)d$/.exec(expr);
    return match ? Number(match[1]) : 30;
  }
}
