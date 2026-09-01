import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateVehicleCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsInt() @Min(1) seatingCapacity: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() iconUrl?: string;
  @ApiProperty({ required: false, default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ required: false, default: 0 }) @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateVehicleCategoryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) seatingCapacity?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() iconUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() sortOrder?: number;
}
