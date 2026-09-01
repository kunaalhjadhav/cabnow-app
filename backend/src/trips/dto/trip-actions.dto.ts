import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class VerifyTripOtpDto {
  @ApiProperty() @IsString() otpCode: string;
}

export class StopActionDto {
  @ApiProperty() @IsString() tripStopId: string;
}

export class CompleteTripDto {
  @ApiProperty({ required: false, description: 'Actual distance if known (e.g. from GPS trail); falls back to the booking estimate' })
  @IsOptional() @IsNumber() @Min(0) actualDistanceKm?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber() @Min(0) actualDurationMinutes?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) tollAmount?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) parkingAmount?: number;

  @ApiProperty({ enum: PaymentMethod, required: false, default: PaymentMethod.UPI })
  @IsOptional() @IsIn(Object.values(PaymentMethod)) paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false }) @IsOptional() @IsString() polyline?: string;
}

export class RateTripDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsNumber() @Min(1) score: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() comment?: string;
  @ApiProperty() @IsString() ratedUserId: string;
}
