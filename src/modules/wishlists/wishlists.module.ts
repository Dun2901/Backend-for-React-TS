import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WishlistsController } from './wishlists.controller';
import { WishlistsService } from './wishlists.service';
import { Wishlist, WishlistSchema } from './schemas/wishlist.schema';
import { Book, BookSchema } from '@/modules/books/schemas/book.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Book.name, schema: BookSchema },
    ]),
  ],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService],
})
export class WishlistsModule {}
