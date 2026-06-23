import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  COD = 'COD',
  ONLINE = 'ONLINE',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  })
  bookId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  bookName: string;

  @Prop()
  thumbnail: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  address: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true, index: true })
  orderCode: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: mongoose.Types.ObjectId;

  @Prop({
    type: [OrderItemSchema],
    default: [],
    required: true,
  })
  items: OrderItem[];

  @Prop({
    type: ShippingAddressSchema,
    required: true,
  })
  shippingAddress: ShippingAddress;

  @Prop()
  totalPrice: number;

  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Prop()
  note: string;

  @Prop({ type: Object })
  createdBy: { _id: mongoose.Types.ObjectId; email: string };

  @Prop({ type: Object })
  updatedBy: { _id: mongoose.Types.ObjectId; email: string };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
