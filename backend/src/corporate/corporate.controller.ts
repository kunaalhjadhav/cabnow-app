import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CorporateService } from './corporate.service';
import {
  CreateCorporateCompanyDto,
  InviteCorporateUserDto,
  UpdateCorporateCompanyDto,
  UpsertRouteEditConfigDto,
} from './dto/corporate.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

const CORPORATE_ROLES: UserRole[] = [UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_BOOKER, UserRole.CORPORATE_APPROVER];

@ApiTags('corporate')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('corporate/companies')
export class CorporateController {
  constructor(private readonly service: CorporateService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post()
  create(@Body() dto: CreateCorporateCompanyDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.FINANCE_ADMIN)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.FINANCE_ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_BOOKER, UserRole.CORPORATE_APPROVER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, id);
    return this.service.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCorporateCompanyDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.CORPORATE_ADMIN)
  @Post(':id/users')
  inviteUser(@Param('id') id: string, @Body() dto: InviteCorporateUserDto, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, id);
    return this.service.inviteUser(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.CORPORATE_ADMIN)
  @Get(':id/users')
  listUsers(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, id);
    return this.service.listUsers(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_BOOKER)
  @Get(':id/route-edit-config')
  getRouteEditConfig(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, id);
    return this.service.getRouteEditConfig(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post(':id/route-edit-config')
  upsertRouteEditConfig(@Param('id') id: string, @Body() dto: UpsertRouteEditConfigDto) {
    return this.service.upsertRouteEditConfig(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.FINANCE_ADMIN, UserRole.CORPORATE_ADMIN)
  @Get(':id/billing-summary')
  billingSummary(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, id);
    return this.service.billingSummary(id);
  }

  /** A CORPORATE_* user may only ever act on their own company (spec §12 data isolation). */
  private assertOwnCompany(user: AuthenticatedUser, companyId: string) {
    if (CORPORATE_ROLES.includes(user.role as UserRole) && user.companyId !== companyId) {
      throw new ForbiddenException("You don't have access to this company");
    }
  }
}

@ApiTags('corporate')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('corporate/route-edit-config')
export class PlatformRouteEditConfigController {
  constructor(private readonly service: CorporateService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @Post('default')
  upsertDefault(@Body() dto: UpsertRouteEditConfigDto) {
    return this.service.upsertRouteEditConfig(null, dto);
  }
}
