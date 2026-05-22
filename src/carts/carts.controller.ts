import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { ResponseMessage, User } from '@/decorator/customize';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get('me')
  @ResponseMessage('Lấy giỏ hàng thành công')
  getMyCart(@User() user: IUser) {
    return this.cartsService.getMyCart(user._id);
  }

  @Post('items')
  @ResponseMessage('Thêm sách vào giỏ hàng thành công')
  addItem(@User() user: IUser, @Body() addCartItemDto: AddCartItemDto) {
    return this.cartsService.addItem(user._id, addCartItemDto);
  }

  @Patch('items/:bookId')
  @ResponseMessage('Cập nhật số lượng thành công')
  updateItem(
    @User() user: IUser,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(user._id, bookId, dto);
  }

  @Delete('items/:bookId')
  @ResponseMessage('Xóa sách khỏi giỏ hàng thành công')
  removeItem(@User() user: IUser, @Param('bookId') bookId: string) {
    return this.cartsService.removeItem(user._id, bookId);
  }

  @Delete('clear')
  @ResponseMessage('Xóa toàn bộ giỏ hàng thành công')
  clearCart(@User() user: IUser) {
    return this.cartsService.clearCart(user._id);
  }
}
