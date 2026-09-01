import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get('me')
  me(@CurrentUser('userId') userId: string) {
    return this.service.findByUserId(userId);
  }

  @Patch('me/addresses')
  updateAddresses(@CurrentUser('userId') userId: string, @Body() body: { homeAddress?: string; workAddress?: string }) {
    return this.service.updateAddresses(userId, body);
  }

  @Patch('me/emergency-contacts')
  updateEmergencyContacts(@CurrentUser('userId') userId: string, @Body() body: { contacts: Array<{ name: string; phone: string }> }) {
    return this.service.updateEmergencyContacts(userId, body.contacts);
  }

  @Get('me/trips')
  myTrips(@CurrentUser('userId') userId: string) {
    return this.service.tripHistory(userId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.SUPPORT_ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN, UserRole.SUPPORT_ADMIN)
  @UseGuards(RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
