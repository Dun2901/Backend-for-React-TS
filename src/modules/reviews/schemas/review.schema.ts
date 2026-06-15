import { Book } from '@/modules/books/schemas/book.schema';
import { Order } from '@/modules/orders/schemas/order.schema';
import { User } from '@/modules/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

export enum ReviewMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

@Schema({ _id: false })
export class ReviewMedia {
  @Prop({ required: true })
  url: string;

  @Prop()
  publicId?: string;

  @Prop({ enum: ReviewMediaType, default: ReviewMediaType.IMAGE })
  type: ReviewMediaType;
}

export const ReviewMediaSchema = SchemaFactory.createForClass(ReviewMedia);

@Schema({ timestamps: true })
export class Review {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Book.name,
    required: true,
    index: true,
  })
  bookId: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Order.name,
    required: true,
    index: true,
  })
  orderId: mongoose.Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ trim: true, maxlength: 1500 })
  comment?: string;

  @Prop({ type: [ReviewMediaSchema], default: [] })
  media: ReviewMedia[];

  @Prop({
    type: [mongoose.Schema.Types.ObjectId],
    ref: User.name,
    default: [],
  })
  helpfulBy: mongoose.Types.ObjectId[];

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Types.ObjectId;
    email: string;
  };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  /*
   * _id: Mongoose tự thêm mặc định
   * createdAt, updatedAt: timestamps: true tự thêm
   * deleted, deletedAt, deletedBy: mongoose-delete plugin xử lý
   */
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
