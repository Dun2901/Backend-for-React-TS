import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ResponseMessage, Roles, User } from '@/common/decorators/customize';
import { CheckoutDto } from './dto/checkout.dto';
import { UserRoles } from '@/common/enums';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ResponseMessage('Đặt hàng thành công')
  checkout(@User() user: IUser, @Body() checkoutDto: CheckoutDto) {
    return this.ordersService.checkout(user, checkoutDto);
  }

  @Get('my-orders')
  @ResponseMessage('Lấy danh sách đơn hàng của tôi thành công')
  findMyOrders(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
    @User() user: IUser,
  ) {
    return this.ordersService.findMyOrders(+currentPage, +limit, qs, user);
  }

  @Get()
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Lấy danh sách đơn hàng thành công')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.ordersService.findAll(+currentPage, +limit, qs);
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết đơn hàng thành công')
  findOne(@Param('id') id: string, @User() user: IUser) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Cập nhật trạng thái đơn hàng thành công')
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @User() user: IUser,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user);
  }

  @Patch(':id/cancel')
  @ResponseMessage('Hủy đơn hàng thành công')
  cancel(@Param('id') id: string, @User() user: IUser) {
    return this.ordersService.cancel(id, user);
  }
}
