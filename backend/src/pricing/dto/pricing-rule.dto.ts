import { ApiProperty } from '@nestjs/swagger';
import { PricingRuleType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePricingRuleDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: PricingRuleType }) @IsEnum(PricingRuleType) type: PricingRuleType;
  @ApiProperty({ required: false }) @IsOptional() @IsString() categoryId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() companyId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() zone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() packageType?: string;
  @ApiProperty() @IsNumber() value: number;
  @ApiProperty({ default: false }) @IsOptional() @IsBoolean() isPercentage?: boolean;
  @ApiProperty({ required: false, description: 'e.g. {"startHour":22,"endHour":6} for night surcharge, {"multiplier":1.3} for surge' })
  @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @ApiProperty({ default: 0 }) @IsOptional() @IsInt() priority?: number;
  @ApiProperty({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() effectiveFrom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() effectiveTo?: string;
}

export class UpdatePricingRuleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() value?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isPercentage?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() priority?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() effectiveFrom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() effectiveTo?: string;
}
