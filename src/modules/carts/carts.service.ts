import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { Cart, CartDocument } from './schemas/cart.schema';
import { Book, BookDocument } from '@/modules/books/schemas/book.schema';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

const POPULATE_BOOK = {
  path: 'items.bookId',
  select: '_id mainText thumbnail price quantity',
};

const SELECT_FIELDS = '-deleted -items.deleted';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name) private cartModel: SoftDeleteModel<CartDocument>,
    @InjectModel(Book.name) private bookModel: SoftDeleteModel<BookDocument>,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private findOrCreateCart(userId: string) {
    return this.cartModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, items: [], totalItems: 0, totalPrice: 0 } },
      { upsert: true, returnDocument: 'after' },
    );
  }

  // ─── API Methods ──────────────────────────────────────────────────────────

  async getMyCart(userId: string) {
    return this.cartModel
      .findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, items: [], totalItems: 0, totalPrice: 0 } },
        { upsert: true, returnDocument: 'after' },
      )
      .select(SELECT_FIELDS)
      .populate(POPULATE_BOOK);
  }

  async addItem(userId: string, addCartItemDto: AddCartItemDto) {
    const { bookId, quantity } = addCartItemDto;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new BadRequestException('bookId không hợp lệ');
    }

    const book = await this.bookModel.findById(bookId);
    if (!book) {
      throw new NotFoundException('Sách không tồn tại');
    }

    const cart = await this.findOrCreateCart(userId);
    const existingItem = cart.items.find((item) => item.bookId.equals(bookId));
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > book.quantity) {
        throw new BadRequestException(
          `Tổng quantity (${newQuantity}) vượt quá tồn kho (${book.quantity})`,
        );
      }

      return this.cartModel
        .findOneAndUpdate(
          { userId, 'items.bookId': bookId },
          {
            $inc: {
              'items.$.quantity': quantity,
              totalItems: quantity,
              totalPrice: quantity * existingItem.priceAtAdd,
            },
          },
          { returnDocument: 'after' },
        )
        .select(SELECT_FIELDS)
        .populate(POPULATE_BOOK);
    } else {
      if (quantity > book.quantity) {
        throw new BadRequestException(
          `Quantity (${quantity}) vượt quá tồn kho (${book.quantity})`,
        );
      }

      return this.cartModel
        .findOneAndUpdate(
          { userId },
          {
            $push: { items: { bookId, quantity, priceAtAdd: book.price } },
            $inc: {
              totalItems: quantity,
              totalPrice: quantity * book.price,
            },
          },
          { returnDocument: 'after' },
        )
        .select(SELECT_FIELDS)
        .populate(POPULATE_BOOK);
    }
  }

  async updateItem(userId: string, bookId: string, updateCartItemDto: UpdateCartItemDto) {
    const { quantity } = updateCartItemDto;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new BadRequestException('bookId không hợp lệ');
    }

    const book = await this.bookModel.findById(bookId);
    if (!book) {
      throw new NotFoundException('Sách không tồn tại');
    }

    if (quantity > book.quantity) {
      throw new BadRequestException(
        `Quantity (${quantity}) vượt quá tồn kho (${book.quantity})`,
      );
    }

    const cart = await this.cartModel.findOne({ userId });
    const existingItem = cart?.items.find((item) => item.bookId.equals(bookId));
    if (!existingItem) {
      throw new NotFoundException('Sách này chưa có trong giỏ hàng');
    }

    const quantityDelta = quantity - existingItem.quantity;
    const priceDelta = quantityDelta * existingItem.priceAtAdd;

    return this.cartModel
      .findOneAndUpdate(
        { userId, 'items.bookId': bookId },
        {
          $set: { 'items.$.quantity': quantity },
          $inc: { totalItems: quantityDelta, totalPrice: priceDelta },
        },
        { returnDocument: 'after' },
      )
      .select(SELECT_FIELDS)
      .populate(POPULATE_BOOK);
  }

  async removeItem(userId: string, bookId: string) {
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new BadRequestException('bookId không hợp lệ');
    }

    const cart = await this.cartModel.findOne({ userId });
    const existingItem = cart?.items.find((item) => item.bookId.equals(bookId));
    if (!existingItem) {
      throw new NotFoundException('Sách này chưa có trong giỏ hàng');
    }

    return this.cartModel
      .findOneAndUpdate(
        { userId },
        {
          $pull: { items: { bookId: new mongoose.Types.ObjectId(bookId) } },
          $inc: {
            totalItems: -existingItem.quantity,
            totalPrice: -(existingItem.quantity * existingItem.priceAtAdd),
          },
        },
        { returnDocument: 'after' },
      )
      .select(SELECT_FIELDS)
      .populate(POPULATE_BOOK);
  }

  async clearCart(userId: string) {
    return this.cartModel
      .findOneAndUpdate(
        { userId },
        { $set: { items: [], totalItems: 0, totalPrice: 0 } },
        { returnDocument: 'after' },
      )
      .select(SELECT_FIELDS);
  }
}
