import { Book } from '@/modules/books/schemas/book.schema';
import { User } from '@/modules/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ _id: false })
export class CartItem {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Book.name,
    required: true,
  })
  bookId: mongoose.Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  priceAtAdd: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    unique: true,
  })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ default: 0 })
  totalItems: number;

  @Prop({ default: 0 })
  totalPrice: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
