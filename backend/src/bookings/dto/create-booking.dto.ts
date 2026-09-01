import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BookingSource, BookingType } from '@prisma/client';

export class LocationDto {
  @ApiProperty() @IsString() label: string;
  @ApiProperty() @IsLatitude() lat: number;
  @ApiProperty() @IsLongitude() lng: number;
}

export class StopDto extends LocationDto {
  @ApiProperty({ default: 0 }) @IsOptional() @IsInt() @Min(0) plannedWaitMinutes?: number;
}

export class CreateBookingDto {
  @ApiProperty({ enum: BookingSource }) @IsEnum(BookingSource) source: BookingSource;
  @ApiProperty({ enum: BookingType }) @IsEnum(BookingType) type: BookingType;

  @ApiProperty({ required: false }) @IsOptional() @IsString() customerId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() companyId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() employeeId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() packageId?: string;

  @ApiProperty() @IsString() categoryId: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested() @Type(() => LocationDto) pickup: LocationDto;

  @ApiProperty({ type: LocationDto })
  @ValidateNested() @Type(() => LocationDto) drop: LocationDto;

  @ApiProperty({ type: [StopDto], required: false, description: 'Intermediate stops in visit order' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => StopDto)
  stops?: StopDto[];

  @ApiProperty({ required: false, description: 'Omit for an immediate booking' })
  @IsOptional() @IsDateString() scheduledAt?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() passengerName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsPhoneNumber() passengerPhone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specialInstructions?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() zone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() discountCode?: string;
}
