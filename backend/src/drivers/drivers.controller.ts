import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverLocationDto, UploadDriverDocumentDto } from './dto/driver.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('drivers')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly service: DriversService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.VENDOR_ADMIN)
  @Post()
  create(@Body() dto: CreateDriverDto, @CurrentUser() user: AuthenticatedUser) {
    // A VENDOR_ADMIN can only ever onboard drivers under their own vendor.
    if (user.role === UserRole.VENDOR_ADMIN) {
      if (dto.vendorId && dto.vendorId !== user.vendorId) {
        throw new ForbiddenException('You can only add drivers to your own vendor fleet');
      }
      dto.vendorId = user.vendorId;
    }
    return this.service.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.VENDOR_ADMIN)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('isOnline') isOnline?: string,
  ) {
    // A VENDOR_ADMIN can only ever list their own vendor's drivers, whatever vendorId they pass.
    const scopedVendorId = user.role === UserRole.VENDOR_ADMIN ? user.vendorId : vendorId;
    return this.service.findAll({ vendorId: scopedVendorId, status, isOnline: isOnline === undefined ? undefined : isOnline === 'true' });
  }

  @Get('me')
  findMe(@CurrentUser('userId') userId: string) {
    return this.service.findByUserId(userId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.VENDOR_ADMIN, UserRole.DRIVER)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const driver = await this.service.findOne(id);
    if (user.role === UserRole.DRIVER && user.driverId !== id) {
      throw new ForbiddenException("You don't have access to this driver profile");
    }
    if (user.role === UserRole.VENDOR_ADMIN && driver.vendorId !== user.vendorId) {
      throw new ForbiddenException("You don't have access to this driver profile");
    }
    return driver;
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/documents')
  uploadDocument(@Param('id') id: string, @Body() dto: UploadDriverDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnDriver(user, id);
    return this.service.uploadDocument(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch('documents/:documentId/review')
  reviewDocument(
    @Param('documentId') documentId: string,
    @Body('status') status: 'APPROVED' | 'REJECTED',
    @CurrentUser('userId') reviewerId: string,
  ) {
    return this.service.reviewDocument(documentId, status, reviewerId);
  }

  @Roles(UserRole.DRIVER)
  @Patch(':id/online-status')
  setOnlineStatus(@Param('id') id: string, @Body('isOnline') isOnline: boolean, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnDriver(user, id);
    return this.service.setOnlineStatus(id, isOnline);
  }

  @Roles(UserRole.DRIVER)
  @Patch(':id/location')
  updateLocation(@Param('id') id: string, @Body() dto: UpdateDriverLocationDto, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnDriver(user, id);
    return this.service.updateLocation(id, dto);
  }

  /** A DRIVER can only ever act as themselves — prevents spoofing another driver's docs/status/location. */
  private assertOwnDriver(user: AuthenticatedUser, driverId: string) {
    if (user.driverId !== driverId) {
      throw new ForbiddenException('You can only act on your own driver profile');
    }
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
