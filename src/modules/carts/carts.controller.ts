import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CartsService } from './carts.service';
import { ResponseMessage, User } from '@/common/decorators/customize';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get('me')
  @ResponseMessage('Lấy giỏ hàng thành công')
  getMyCart(@User() user: IUser) {
    return this.cartsService.getMyCart(user._id);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('items')
  @ResponseMessage('Thêm sách vào giỏ hàng thành công')
  addItem(@User() user: IUser, @Body() addCartItemDto: AddCartItemDto) {
    return this.cartsService.addItem(user._id, addCartItemDto);
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Patch('items/:bookId')
  @ResponseMessage('Cập nhật số lượng thành công')
  updateItem(@User() user: IUser, @Param('bookId') bookId: string, @Body() dto: UpdateCartItemDto) {
    return this.cartsService.updateItem(user._id, bookId, dto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Delete('items/:bookId')
  @ResponseMessage('Xóa sách khỏi giỏ hàng thành công')
  removeItem(@User() user: IUser, @Param('bookId') bookId: string) {
    return this.cartsService.removeItem(user._id, bookId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Delete('clear')
  @ResponseMessage('Xóa toàn bộ giỏ hàng thành công')
  clearCart(@User() user: IUser) {
    return this.cartsService.clearCart(user._id);
  }
}
