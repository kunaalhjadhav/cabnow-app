import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PricingRuleType, UserRole } from '@prisma/client';
import { PricingService } from './pricing.service';
import { CreatePricingRuleDto, UpdatePricingRuleDto } from './dto/pricing-rule.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('pricing')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.FINANCE_ADMIN)
@UseGuards(RolesGuard)
@Controller('pricing-rules')
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Post()
  create(@Body() dto: CreatePricingRuleDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('type') type?: PricingRuleType,
    @Query('categoryId') categoryId?: string,
    @Query('companyId') companyId?: string,
    @Query('city') city?: string,
  ) {
    return this.service.findAll({ type, categoryId, companyId, city });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePricingRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
