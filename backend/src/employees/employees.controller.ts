import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

const CORPORATE_STAFF = [UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_BOOKER];
const CORPORATE_ROLES: UserRole[] = [UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_BOOKER];

@ApiTags('employees')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('corporate/companies/:companyId/employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Roles(...CORPORATE_STAFF)
  @Post()
  create(@Param('companyId') companyId: string, @Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, companyId);
    return this.service.create(companyId, dto);
  }

  @Roles(...CORPORATE_STAFF)
  @Get()
  findAll(@Param('companyId') companyId: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, companyId);
    return this.service.findAllForCompany(companyId);
  }

  @Roles(...CORPORATE_STAFF)
  @Get(':id')
  async findOne(@Param('companyId') companyId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, companyId);
    const employee = await this.service.findOne(id);
    this.assertEmployeeBelongsToPath(employee, companyId);
    return employee;
  }

  @Roles(...CORPORATE_STAFF)
  @Patch(':id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertOwnCompany(user, companyId);
    this.assertEmployeeBelongsToPath(await this.service.findOne(id), companyId);
    return this.service.update(id, dto);
  }

  @Roles(...CORPORATE_STAFF)
  @Delete(':id')
  async remove(@Param('companyId') companyId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, companyId);
    this.assertEmployeeBelongsToPath(await this.service.findOne(id), companyId);
    return this.service.remove(id);
  }

  @Roles(...CORPORATE_STAFF)
  @Get(':id/trips')
  async tripHistory(@Param('companyId') companyId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwnCompany(user, companyId);
    this.assertEmployeeBelongsToPath(await this.service.findOne(id), companyId);
    return this.service.tripHistory(id);
  }

  /** A CORPORATE_* user may only ever act within their own company's employee roster (spec §12). */
  private assertOwnCompany(user: AuthenticatedUser, companyId: string) {
    if (CORPORATE_ROLES.includes(user.role as UserRole) && user.companyId !== companyId) {
      throw new ForbiddenException("You don't have access to this company");
    }
  }

  /** Defends against an :id that exists but belongs to a different company than the URL's :companyId. */
  private assertEmployeeBelongsToPath(employee: { companyId: string }, companyId: string) {
    if (employee.companyId !== companyId) {
      throw new ForbiddenException("You don't have access to this employee");
    }
  }
}
