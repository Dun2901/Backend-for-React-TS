import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  ORDER_STATUS = 'ORDER_STATUS',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    enum: NotificationType,
    required: true,
  })
  type: NotificationType;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  })
  orderId?: mongoose.Types.ObjectId;

  @Prop()
  orderCode?: string;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
