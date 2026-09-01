import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CommissionService } from './commission.service';
import { CreateCommissionRuleDto, UpdateCommissionRuleDto } from './dto/commission-rule.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('commission')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
@UseGuards(RolesGuard)
@Controller('commission-rules')
export class CommissionController {
  constructor(private readonly service: CommissionService) {}

  @Post()
  create(@Body() dto: CreateCommissionRuleDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('vendorId') vendorId?: string, @Query('driverId') driverId?: string, @Query('companyId') companyId?: string) {
    return this.service.findAll({ vendorId, driverId, companyId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommissionRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
