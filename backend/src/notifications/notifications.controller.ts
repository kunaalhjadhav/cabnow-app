import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.service.listForUser(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.service.markRead(id, userId);
  }
}
