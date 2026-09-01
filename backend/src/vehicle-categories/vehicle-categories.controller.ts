import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VehicleCategoriesService } from './vehicle-categories.service';
import { CreateVehicleCategoryDto, UpdateVehicleCategoryDto } from './dto/vehicle-category.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('vehicle-categories')
@Controller('vehicle-categories')
export class VehicleCategoriesController {
  constructor(private readonly service: VehicleCategoriesService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @Post()
  create(@Body() dto: CreateVehicleCategoryDto) {
    return this.service.create(dto);
  }

  @Public()
  @Get()
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.service.findAll(activeOnly === 'true');
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleCategoryDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
