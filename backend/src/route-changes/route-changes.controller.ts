import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RouteChangesService } from './route-changes.service';
import { RejectRouteChangeDto, RequestRouteChangeDto } from './dto/route-change.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('route-changes')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Audit('ROUTE_CHANGE')
@Controller()
export class RouteChangesController {
  constructor(private readonly service: RouteChangesService) {}

  // No @Roles here by design — any of CUSTOMER/CORPORATE_*/DRIVER/admin may request a change,
  // but RouteChangesService.request() enforces that the requestor actually owns this trip.
  @Post('trips/:tripId/route-changes')
  request(@Param('tripId') tripId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: RequestRouteChangeDto) {
    return this.service.request(tripId, user, dto);
  }

  @Get('trips/:tripId/route-changes')
  findForTrip(@Param('tripId') tripId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findForTrip(tripId, user);
  }

  @Roles(UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_APPROVER, UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Get('route-changes/pending-approvals')
  pending(@CurrentUser() user: AuthenticatedUser, @Query('companyId') companyId?: string) {
    return this.service.findPendingApprovals(user, companyId);
  }

  @Roles(UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_APPROVER, UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post('route-changes/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approve(id, user);
  }

  @Roles(UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_APPROVER, UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post('route-changes/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: RejectRouteChangeDto) {
    return this.service.reject(id, user, dto.reason);
  }
}
