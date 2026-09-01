import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRazorpayOrderDto {
  @ApiProperty() @IsString() paymentId: string;
}

export class VerifyRazorpayPaymentDto {
  @ApiProperty() @IsString() razorpayOrderId: string;
  @ApiProperty() @IsString() razorpayPaymentId: string;
  @ApiProperty() @IsString() razorpaySignature: string;
}
