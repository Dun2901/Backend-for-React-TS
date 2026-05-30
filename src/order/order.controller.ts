import { Controller, Body, Post, UseGuards, Req } from '@nestjs/common';
import { OrderService } from '@/order/order.service';
import { CreateOrderDto } from '@/order/dto/create.order.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user._id;
    return this.orderService.create(userId, createOrderDto);
  }
}
