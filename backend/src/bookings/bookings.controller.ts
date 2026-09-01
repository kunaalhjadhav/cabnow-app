import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Audit('BOOKING')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('customerId') customerId?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(user, { customerId, companyId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOneScoped(id, user);
  }

  @Roles(UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_APPROVER, UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approve(id, user);
  }

  @Roles(UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_APPROVER, UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body('reason') reason?: string) {
    return this.service.reject(id, user, reason);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CancelBookingDto) {
    return this.service.cancel(id, user, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post(':id/dispatch')
  dispatch(@Param('id') id: string) {
    return this.service.confirmAndDispatch(id);
  }
}
