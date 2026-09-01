import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApprovalWorkflowRole, UserRole } from '@prisma/client';

/**
 * The only roles a corporate invite may ever grant. Deliberately NOT `@IsEnum(UserRole)` —
 * that would validate against the *entire* platform UserRole enum (SUPER_ADMIN, VENDOR_ADMIN,
 * DRIVER, ...), letting a CORPORATE_ADMIN privilege-escalate an invited phone number straight
 * to platform superadmin. This is the actual enforcement; the three-role list is not just docs.
 */
export const INVITABLE_CORPORATE_ROLES = [UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_BOOKER, UserRole.CORPORATE_APPROVER] as const;

export class CreateCorporateCompanyDto {
  @ApiProperty() @IsString() legalName: string;
  @ApiProperty() @IsString() displayName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() gstNumber?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() billingAddress?: string;
  @ApiProperty() @IsEmail() contactEmail: string;
  @ApiProperty() @IsString() contactPhone: string;
  @ApiProperty({ required: false, default: 0 }) @IsOptional() @IsNumber() creditLimit?: number;
  @ApiProperty({ required: false, default: 'MONTHLY' }) @IsOptional() @IsString() billingCycle?: string;
}

export class UpdateCorporateCompanyDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() displayName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() billingAddress?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() contactEmail?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() contactPhone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() creditLimit?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() billingCycle?: string;
}

export class InviteCorporateUserDto {
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsString() fullName: string;
  @ApiProperty({ enum: INVITABLE_CORPORATE_ROLES })
  @IsIn(INVITABLE_CORPORATE_ROLES) role: UserRole;
  @ApiProperty({ required: false }) @IsOptional() @IsString() department?: string;
}

export class UpsertRouteEditConfigDto {
  @ApiProperty({ default: false }) @IsBoolean() routeEditingAllowed: boolean;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) maxAdditionalStops: number;
  @ApiProperty({ default: 0 }) @IsNumber() @Min(0) maxRouteDeviationKm: number;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) maxAdditionalWaitingMinutes: number;
  @ApiProperty({ default: true }) @IsBoolean() approvalRequired: boolean;
  @ApiProperty({ enum: ApprovalWorkflowRole, default: ApprovalWorkflowRole.BOOKER })
  @IsEnum(ApprovalWorkflowRole) approverRole: ApprovalWorkflowRole;
  @ApiProperty({ default: true }) @IsBoolean() additionalChargesAllowed: boolean;
}
