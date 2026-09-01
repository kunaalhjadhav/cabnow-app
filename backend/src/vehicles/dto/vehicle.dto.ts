import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty() @IsString() vendorId: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiProperty() @IsString() registrationNumber: string;
  @ApiProperty() @IsString() make: string;
  @ApiProperty() @IsString() model: string;
  @ApiProperty() @IsInt() @Min(1980) year: number;
  @ApiProperty() @IsString() colour: string;
  @ApiProperty() @IsInt() @Min(1) seatingCapacity: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() rcDocumentUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() insuranceDocumentUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() permitDocumentUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() fitnessCertificateUrl?: string;
}

export class UpdateVehicleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() categoryId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() colour?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() rcDocumentUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() insuranceDocumentUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() permitDocumentUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() fitnessCertificateUrl?: string;
}
