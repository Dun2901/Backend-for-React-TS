import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { WishlistsService } from './wishlists.service';
import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import { User } from './../../common/decorators/customize';

@Controller('wishlists')
@UseGuards(JwtAuthGuard)
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get('me')
  async getMyWishlist(@User() user: any) {
    const data = await this.wishlistsService.getWishlist(user._id);
    return {
      statusCode: 200,
      message: 'Lấy danh sách yêu thích thành công',
      data,
    };
  }

  //  POST /wishlists/:bookId
  @Post(':bookId')
  async addBookToWishlist(@User() user: any, @Param('bookId') bookId: string) {
    const data = await this.wishlistsService.addToWishlist(user._id, bookId);
    return {
      statusCode: 201,
      message: 'Đã thêm sách vào danh sách yêu thích',
      data,
    };
  }

  // DELETE /wishlists/:bookId
  @Delete(':bookId')
  async removeBookFromWishlist(@User() user: any, @Param('bookId') bookId: string) {
    // Thực hiện xóa sách ra khỏi mảng lưu trữ của user
    const data = await this.wishlistsService.removeFromWishlist(user._id, bookId);
    return {
      statusCode: 200,
      message: 'Xóa sách khỏi danh sách yêu thích thành công',
      data,
    };
  }
}
