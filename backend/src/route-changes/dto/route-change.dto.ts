import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsLatitude, IsLongitude, IsOptional, IsString, ValidateNested } from 'class-validator';
import { StopDto } from '../../bookings/dto/create-booking.dto';

export class RequestRouteChangeDto {
  @ApiProperty({ type: [StopDto], description: 'Full new list of remaining stops (in order) up to the destination' })
  @ArrayMinSize(0) @ValidateNested({ each: true }) @Type(() => StopDto)
  newStops: StopDto[];

  @ApiProperty({ description: "Passenger/driver's current location when requesting the change" })
  @IsLatitude() changeLat: number;

  @ApiProperty()
  @IsLongitude() changeLng: number;

  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}

export class RejectRouteChangeDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}
