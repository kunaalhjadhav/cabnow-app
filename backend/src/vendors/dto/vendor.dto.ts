import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty() @IsString() legalName: string;
  @ApiProperty() @IsString() displayName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() gstNumber?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() panNumber?: string;
  @ApiProperty() @IsString() contactPhone: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() contactEmail?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bankAccountNumber?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bankIfsc?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() zone?: string;
}

export class UpdateVendorDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() legalName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() displayName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() gstNumber?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() panNumber?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() contactPhone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() contactEmail?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bankAccountNumber?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bankIfsc?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() zone?: string;
  @ApiProperty({ required: false, enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED'] })
  @IsOptional() @IsString() status?: string;
}
