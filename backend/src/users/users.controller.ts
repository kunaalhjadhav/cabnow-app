import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('me')
  me(@CurrentUser('userId') userId: string) {
    return this.service.findOne(userId);
  }

  @Patch('me')
  updateMe(@CurrentUser('userId') userId: string, @Body() body: { fullName?: string; email?: string; profilePhotoUrl?: string; languagePreference?: string }) {
    return this.service.updateProfile(userId, body);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.SUPPORT_ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  findAll(@Query('role') role?: UserRole) {
    return this.service.findAll(role);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.SUPPORT_ADMIN)
  @UseGuards(RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED') {
    return this.service.updateStatus(id, status);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Post('staff')
  createStaff(@Body() body: { phone: string; fullName: string; email?: string; role: UserRole }) {
    return this.service.createStaffUser(body);
  }
}
