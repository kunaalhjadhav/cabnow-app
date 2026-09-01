import { ApiProperty } from '@nestjs/swagger';
import { CommissionBasis } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCommissionRuleDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: CommissionBasis, default: CommissionBasis.PERCENTAGE }) @IsEnum(CommissionBasis) basis: CommissionBasis;
  @ApiProperty({ description: 'Percentage (0-100) when basis=PERCENTAGE, or a fixed amount when basis=FIXED_AMOUNT' })
  @IsNumber() value: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() vendorId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() driverId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() categoryId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() companyId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() zone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() packageType?: string;
  @ApiProperty({ default: 0 }) @IsOptional() @IsInt() priority?: number;
  @ApiProperty({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() effectiveFrom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() effectiveTo?: string;
}

export class UpdateCommissionRuleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() value?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() priority?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() effectiveFrom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() effectiveTo?: string;
}
