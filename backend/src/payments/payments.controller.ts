import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreateRazorpayOrderDto, VerifyRazorpayPaymentDto } from './dto/payment.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @ApiBearerAuth('access-token')
  @Post('razorpay/order')
  createOrder(@Body() dto: CreateRazorpayOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createOrder(dto.paymentId, user);
  }

  @ApiBearerAuth('access-token')
  @Post('razorpay/verify')
  verify(@Body() dto: VerifyRazorpayPaymentDto) {
    return this.service.verifyAndCapture(dto);
  }

  // Razorpay calls this directly — no user JWT is present, so it's public and
  // authenticated instead via the X-Razorpay-Signature HMAC header.
  // NOTE: for a byte-exact HMAC check in production, configure Nest to expose
  // the raw request body for this route (e.g. `bodyParser: false` + a raw
  // body middleware) rather than relying on the re-serialized JSON used here.
  @Public()
  @Post('razorpay/webhook')
  webhook(@Headers('x-razorpay-signature') signature: string, @Body() payload: any) {
    return this.service.handleWebhook(JSON.stringify(payload), signature, payload);
  }

  @ApiBearerAuth('access-token')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  @UseGuards(RolesGuard)
  @Post(':id/refund')
  refund(@Param('id') id: string, @Body('amount') amount?: number) {
    return this.service.refund(id, amount);
  }
}
