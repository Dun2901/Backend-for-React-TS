import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  fullName: string;

  @Prop({ type: Number, required: true })
  phone: number;

  @Prop({ required: true })
  address: string;

  @Prop({ type: String, enum: ['COD', 'VNPAY'], default: 'COD' })
  paymentMethod: string;

  @Prop([
    {
      bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
      quantity: { type: Number, required: true },
      priceAtAdd: { type: Number, required: true },
    },
  ])
  items: {
    bookId: mongoose.Schema.Types.ObjectId;
    quantity: number;
    priceAtAdd: number;
  }[];

  @Prop({ required: true })
  totalPrice: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
