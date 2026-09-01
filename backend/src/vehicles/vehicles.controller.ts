import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('vehicles')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.VENDOR_ADMIN)
  @Post()
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: AuthenticatedUser) {
    // A VENDOR_ADMIN can only ever create vehicles under their own vendor.
    if (user.role === UserRole.VENDOR_ADMIN && dto.vendorId !== user.vendorId) {
      throw new ForbiddenException('You can only add vehicles to your own vendor fleet');
    }
    return this.service.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.VENDOR_ADMIN, UserRole.FINANCE_ADMIN)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const scopedVendorId = user.role === UserRole.VENDOR_ADMIN ? user.vendorId : vendorId;
    return this.service.findAll({ vendorId: scopedVendorId, status, categoryId });
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.VENDOR_ADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const vehicle = await this.service.findOne(id);
    if (user.role === UserRole.VENDOR_ADMIN && vehicle.vendorId !== user.vendorId) {
      throw new ForbiddenException("You don't have access to this vehicle");
    }
    return vehicle;
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.VENDOR_ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @CurrentUser() user: AuthenticatedUser) {
    await this.assertVendorOwnsVehicle(user, id);
    return this.service.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.service.approve(id, userId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.VENDOR_ADMIN)
  @Patch(':id/assign-driver/:driverId')
  async assignDriver(@Param('id') id: string, @Param('driverId') driverId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertVendorOwnsVehicle(user, id);
    return this.service.assignDriver(id, driverId);
  }

  /** A VENDOR_ADMIN may only ever modify vehicles that belong to their own vendor. */
  private async assertVendorOwnsVehicle(user: AuthenticatedUser, vehicleId: string) {
    if (user.role !== UserRole.VENDOR_ADMIN) return;
    const vehicle = await this.service.findOne(vehicleId);
    if (vehicle.vendorId !== user.vendorId) {
      throw new ForbiddenException("You don't have access to this vehicle");
    }
  }
}
