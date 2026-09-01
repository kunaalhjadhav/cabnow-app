import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';

@ApiTags('ratings')
@ApiBearerAuth('access-token')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly service: RatingsService) {}

  @Get('user/:userId')
  forUser(@Param('userId') userId: string) {
    return this.service.forUser(userId);
  }

  @Get('trip/:tripId')
  forTrip(@Param('tripId') tripId: string) {
    return this.service.forTrip(tripId);
  }
}
