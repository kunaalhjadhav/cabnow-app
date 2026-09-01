import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class CreateDriverDto {
  @ApiProperty() @IsString() userId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() vendorId?: string;
  @ApiProperty() @IsString() licenseNumber: string;
}

export class UpdateDriverLocationDto {
  @ApiProperty() @IsLatitude() lat: number;
  @ApiProperty() @IsLongitude() lng: number;
}

export class UploadDriverDocumentDto {
  @ApiProperty({ example: 'DRIVING_LICENSE' }) @IsString() type: string;
  @ApiProperty() @IsString() fileUrl: string;
}
