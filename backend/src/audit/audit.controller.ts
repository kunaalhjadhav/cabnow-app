import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN)
@UseGuards(RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAll({ entityType, entityId, userId, take: take ? Number(take) : undefined });
  }
}
