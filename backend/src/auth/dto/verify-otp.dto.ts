import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * The only roles this PUBLIC, unauthenticated endpoint may ever self-assign on signup.
 * Deliberately NOT `@IsEnum(UserRole)` — this endpoint has `@Public()` on it (it *is* the
 * login/signup flow), so validating against the full UserRole enum would let anyone with a
 * working phone number POST `role: "SUPER_ADMIN"` (or VENDOR_ADMIN / any staff role) and
 * self-register as a platform admin. Every staff/vendor/corporate role must instead be
 * provisioned by an authenticated admin through its own endpoint (POST /users/staff,
 * POST /vendors, POST /corporate/companies/:id/users, ...).
 */
export const SELF_SIGNUP_ROLES = [UserRole.CUSTOMER, UserRole.DRIVER] as const;

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8)
  code: string;

  @ApiProperty({ required: false, description: 'Required the first time a new phone number verifies (signup).' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ enum: SELF_SIGNUP_ROLES, required: false, default: UserRole.CUSTOMER })
  @IsOptional()
  @IsIn(SELF_SIGNUP_ROLES)
  role?: UserRole;
}
