import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TripsService } from './trips.service';
import { CompleteTripDto, RateTripDto, StopActionDto, VerifyTripOtpDto } from './dto/trip-actions.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('trips')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Audit('TRIP')
@Controller('trips')
export class TripsController {
  constructor(private readonly service: TripsService) {}

  // No @Roles here by design — CUSTOMER/CORPORATE_*/DRIVER/admin may all read a trip they're
  // party to; TripsService.findOneScoped() enforces that they actually are.
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOneScoped(id, user);
  }

  @Roles(UserRole.DRIVER)
  @Get('driver/mine')
  findMine(@CurrentUser('driverId') driverId: string, @Query('status') status?: string) {
    return this.service.findForDriver(driverId, status);
  }

  @Roles(UserRole.DRIVER)
  @Patch(':id/driver-arriving')
  driverArriving(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markDriverArriving(id, user);
  }

  @Roles(UserRole.DRIVER)
  @Patch(':id/driver-arrived')
  driverArrived(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markDriverArrived(id, user);
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/verify-otp')
  verifyOtp(@Param('id') id: string, @Body() dto: VerifyTripOtpDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.verifyOtp(id, dto.otpCode, user);
  }

  @Roles(UserRole.DRIVER)
  @Patch(':id/start')
  start(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.startTrip(id, user);
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/stops/arrive')
  arriveAtStop(@Param('id') id: string, @Body() dto: StopActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.arriveAtStop(id, dto.tripStopId, user);
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/stops/depart')
  departStop(@Param('id') id: string, @Body() dto: StopActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.departStop(id, dto.tripStopId, user);
  }

  @Roles(UserRole.DRIVER, UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteTripDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.completeTrip(id, dto, user);
  }

  @Post(':id/rate')
  rate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: RateTripDto) {
    return this.service.rate(id, user, dto);
  }
}
