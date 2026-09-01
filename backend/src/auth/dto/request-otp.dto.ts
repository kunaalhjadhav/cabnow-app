import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsPhoneNumber } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ enum: ['LOGIN', 'SIGNUP', 'RESET'], required: false, default: 'LOGIN' })
  @IsOptional()
  @IsIn(['LOGIN', 'SIGNUP', 'RESET'])
  purpose?: 'LOGIN' | 'SIGNUP' | 'RESET';
}
