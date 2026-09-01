import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupportTicketStatus, UserRole } from '@prisma/client';
import { SupportService } from './support.service';
import { AddSupportMessageDto, CreateSupportTicketDto } from './dto/support.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('support')
@ApiBearerAuth('access-token')
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateSupportTicketDto) {
    return this.service.create(userId, dto);
  }

  @Get('mine')
  mine(@CurrentUser('userId') userId: string) {
    return this.service.findMine(userId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT_ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  findAll(@Query('status') status?: SupportTicketStatus) {
    return this.service.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @CurrentUser('userId') userId: string, @Body() dto: AddSupportMessageDto) {
    return this.service.addMessage(id, userId, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT_ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: SupportTicketStatus, @Body('assignedToUserId') assignedToUserId?: string) {
    return this.service.updateStatus(id, status, assignedToUserId);
  }
}
