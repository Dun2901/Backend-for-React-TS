import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schemas/cart.schema';
import { Book, BookSchema } from '@/modules/books/schemas/book.schema';
import { CartsController } from './carts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Book.name, schema: BookSchema },
    ]),
  ],
  controllers: [CartsController],
  providers: [CartsService],
})
export class CartsModule {}
