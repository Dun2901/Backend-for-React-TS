import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';
import { Book } from '@/modules/books/schemas/book.schema';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
    @InjectModel(Book.name) private bookModel: Model<Book>,
  ) {}

  //lấy danh sách yêu thích
  async getWishlist(userId: string) {
    let wishlist = await this.wishlistModel.findOne({ userId });

    //nếu chưa có thì tạo mới
    if (!wishlist) {
      wishlist = await this.wishlistModel.create({ userId, bookIds: [] });
    }

    const populatedWishlist = await wishlist.populate({
      path: 'bookIds',
      select:
        '_id mainText author thumbnail price sold quantity averageRating reviewCount category',
    });

    //lọc bỏ sách đã bị xóa
    const cleanBookIds = populatedWishlist.bookIds.filter((book) => book !== null);

    return {
      _id: populatedWishlist._id,
      userId: populatedWishlist.userId,
      bookIds: cleanBookIds,
      totalItems: cleanBookIds.length,
    };
  }

  async addToWishlist(userId: string, bookId: string) {
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new BadRequestException('Định dạng ID sách không hợp lệ!');
    }

    const isBookExist = await this.bookModel.findById(bookId);
    if (!isBookExist) {
      throw new NotFoundException('Cuốn sách này không tồn tại hoặc đã bị xóa!');
    }

    await this.wishlistModel.findOneAndUpdate(
      { userId },
      { $addToSet: { bookIds: new mongoose.Types.ObjectId(bookId) } },
      { upsert: true, returnDocument: 'after' },
    );

    return this.getWishlist(userId);
  }

  async removeFromWishlist(userId: string, bookId: string) {
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new BadRequestException('Định dạng ID sách không hợp lệ!');
    }

    await this.wishlistModel.findOneAndUpdate(
      { userId },
      { $pull: { bookIds: new mongoose.Types.ObjectId(bookId) } },
      { returnDocument: 'after' },
    );

    return this.getWishlist(userId);
  }
}
