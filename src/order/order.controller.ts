import {
  Controller,
  Body,
  Post,
  UseGuards,
  Req,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { OrderService } from '@/order/order.service';
import { CreateOrderDto } from '@/order/dto/create.order.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}
  @Post('create')
  async createOrder(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user._id;
    return this.orderService.create(userId, createOrderDto);
  }

  @Get('history')
  async getHistory(@Req() req: any, @Query() query: any) {
    const userId = req.user._id;
    const queryString = new URLSearchParams(query).toString();

    const data = await this.orderService.findOrderHistory(userId, queryString);
    return {
      statusCode: 200,
      message: 'Lấy lịch sử đơn hàng thành công',
      data,
    };
  }
  @Get(':id')
  async getDetail(@Req() req: any, @Param('id') id: string) {
    const userId = req.user._id;
    const order = await this.orderService.findOrderById(id, userId);
    return {
      statusCode: 200,
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order,
    };
  }
}
