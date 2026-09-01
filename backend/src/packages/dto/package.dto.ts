import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({ required: false, description: 'Omit for a platform-wide template' })
  @IsOptional() @IsString() companyId?: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiProperty({ example: 'AIRPORT_TRANSFER' }) @IsString() packageType: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() includedKm?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() includedMinutes?: number;
  @ApiProperty({ required: false, default: 0 }) @IsOptional() @IsInt() @Min(0) includedStops?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() flatFare?: number;
}

export class UpdatePackageDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() includedKm?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() includedMinutes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() includedStops?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() flatFare?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}
