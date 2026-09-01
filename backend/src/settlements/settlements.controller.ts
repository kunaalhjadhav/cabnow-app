import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SettlementsService } from './settlements.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

const FINANCE_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN];

@ApiTags('settlements')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller()
export class SettlementsController {
  constructor(private readonly service: SettlementsService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Post('vendors/:vendorId/settlements/generate')
  generate(@Param('vendorId') vendorId: string, @Body() body: { periodStart: string; periodEnd: string }) {
    return this.service.generateForVendor(vendorId, new Date(body.periodStart), new Date(body.periodEnd));
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.VENDOR_ADMIN)
  @Get('vendors/:vendorId/settlements')
  findForVendor(@Param('vendorId') vendorId: string, @CurrentUser() user: AuthenticatedUser) {
    // A VENDOR_ADMIN may only ever list their own vendor's settlements (spec §12 data isolation).
    if (user.role === UserRole.VENDOR_ADMIN && user.vendorId !== vendorId) {
      throw new ForbiddenException("You don't have access to this vendor's settlements");
    }
    return this.service.findForVendor(vendorId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.VENDOR_ADMIN)
  @Get('settlements/:id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const settlement = await this.service.findOne(id);
    if (user.role === UserRole.VENDOR_ADMIN && settlement.vendorId !== user.vendorId) {
      throw new ForbiddenException("You don't have access to this settlement");
    }
    return settlement;
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Post('settlements/:id/mark-paid')
  markPaid(@Param('id') id: string, @Body('payoutReference') payoutReference: string) {
    return this.service.markPaid(id, payoutReference);
  }

  @Roles(UserRole.DRIVER, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Get('drivers/:driverId/earnings/summary')
  driverSummary(@Param('driverId') driverId: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertDriverAccess(user, driverId);
    return this.service.driverEarningsSummary(driverId);
  }

  @Roles(UserRole.DRIVER, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Get('drivers/:driverId/earnings')
  driverEarnings(@Param('driverId') driverId: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertDriverAccess(user, driverId);
    return this.service.driverEarningsList(driverId);
  }

  /** A DRIVER may only ever read their own earnings; admins can read anyone's. */
  private assertDriverAccess(user: AuthenticatedUser, driverId: string) {
    if (FINANCE_ROLES.includes(user.role as UserRole)) return;
    if (user.role === UserRole.DRIVER && user.driverId === driverId) return;
    throw new ForbiddenException("You don't have access to this driver's earnings");
  }
}
