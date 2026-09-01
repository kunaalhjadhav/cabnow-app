import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller()
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Post('corporate/companies/:companyId/invoices/generate')
  generate(
    @Param('companyId') companyId: string,
    @Body() body: { periodStart: string; periodEnd: string },
  ) {
    return this.service.generateForCompany(companyId, new Date(body.periodStart), new Date(body.periodEnd));
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.CORPORATE_ADMIN)
  @Get('corporate/companies/:companyId/invoices')
  findForCompany(@Param('companyId') companyId: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.role === UserRole.CORPORATE_ADMIN && user.companyId !== companyId) {
      throw new ForbiddenException("You don't have access to this company's invoices");
    }
    return this.service.findForCompany(companyId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.CORPORATE_ADMIN)
  @Get('invoices/:id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const invoice = await this.service.findOne(id);
    if (user.role === UserRole.CORPORATE_ADMIN && invoice.companyId !== user.companyId) {
      throw new ForbiddenException("You don't have access to this invoice");
    }
    return invoice;
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Post('invoices/:id/payments')
  recordPayment(@Param('id') id: string, @Body('amount') amount: number) {
    return this.service.recordPayment(id, amount);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @Post('invoices/:id/void')
  voidInvoice(@Param('id') id: string) {
    return this.service.voidInvoice(id);
  }
}
