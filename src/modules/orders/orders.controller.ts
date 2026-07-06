import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ResponseMessage, Roles, User } from '@/common/decorators/customize';
import { CheckoutDto } from './dto/checkout.dto';
import { UserRoles } from '@/common/enums';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'User đặt hàng từ giỏ hàng' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('checkout')
  @ResponseMessage('Đặt hàng thành công')
  checkout(@User() user: IUser, @Body() checkoutDto: CheckoutDto) {
    return this.ordersService.checkout(user, checkoutDto);
  }

  @ApiOperation({ summary: 'Admin lấy danh sách tất cả đơn hàng' })
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

  @ApiOperation({ summary: 'User lấy danh sách đơn hàng của mình' })
  @Get('my')
  @ResponseMessage('Lấy danh sách đơn hàng của tôi thành công')
  findMyOrders(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
    @User() user: IUser,
  ) {
    return this.ordersService.findMyOrders(+currentPage, +limit, qs, user);
  }

  @ApiOperation({ summary: 'Admin lấy chi tiết đơn hàng' })
  @ApiParam({ name: 'id', example: '667a1c2b3d4e5f6789012345', description: 'ID đơn hàng' })
  @Get(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Lấy chi tiết đơn hàng thành công')
  findOne(@Param('id') id: string, @User() user: IUser) {
    return this.ordersService.findOne(id, user);
  }

  @ApiOperation({
    summary: 'Admin cập nhật trạng thái đơn hàng',
  })
  @ApiParam({ name: 'id', example: '667a1c2b3d4e5f6789012345', description: 'ID đơn hàng' })
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

  @ApiOperation({ summary: 'User hủy đơn hàng khi đơn còn cho phép hủy' })
  @ApiParam({ name: 'id', example: '667a1c2b3d4e5f6789012345', description: 'ID đơn hàng' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':id/cancel')
  @ResponseMessage('Hủy đơn hàng thành công')
  cancel(@Param('id') id: string, @User() user: IUser) {
    return this.ordersService.cancel(id, user);
  }
}
