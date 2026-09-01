import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

const CORPORATE_ROLES: UserRole[] = [UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_BOOKER, UserRole.CORPORATE_APPROVER];

@ApiTags('packages')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('packages')
export class PackagesController {
  constructor(private readonly service: PackagesService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post()
  create(@Body() dto: CreatePackageDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('companyId') companyId?: string) {
    // A negotiated flat-fare package is commercially sensitive — a CORPORATE_* user may only
    // ever see their own company's packages (plus platform-wide templates), regardless of what
    // companyId they pass; only platform admins may browse another company's packages.
    const scopedCompanyId = CORPORATE_ROLES.includes(user.role as UserRole) ? user.companyId : companyId;
    return this.service.findAll(scopedCompanyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const pkg = await this.service.findOne(id);
    if (CORPORATE_ROLES.includes(user.role as UserRole) && pkg.companyId && pkg.companyId !== user.companyId) {
      throw new ForbiddenException("You don't have access to this package");
    }
    return pkg;
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
