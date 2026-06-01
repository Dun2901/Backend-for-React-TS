import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { ResponseMessage, User } from '@/common/decorators/customize';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('vnpay/create-payment-url/:orderId')
  @ResponseMessage('Tạo URL thanh toán VNPay thành công')
  createPaymentUrl(@Param('orderId') orderId: string, @Req() req: Request, @User() user: IUser) {
    return this.paymentsService.createPaymentUrl(orderId, req, user);
  }

  @Get('vnpay-return')
  @ResponseMessage('Kiểm tra kết quả thanh toán VNPay')
  vnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.vnpayReturn(query);
  }

  @Get('vnpay-ipn')
  vnpayIpn(@Query() query: Record<string, string>) {
    return this.paymentsService.vnpayIpn(query);
  }
}
