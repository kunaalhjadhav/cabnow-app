import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('vendors')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.FINANCE_ADMIN)
  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.FINANCE_ADMIN, UserRole.VENDOR_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    // A VENDOR_ADMIN may only ever read their own vendor record (spec §12 data isolation).
    if (user.role === UserRole.VENDOR_ADMIN && user.vendorId !== id) {
      throw new ForbiddenException("You don't have access to this vendor");
    }
    return this.service.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.service.suspend(id);
  }
}
