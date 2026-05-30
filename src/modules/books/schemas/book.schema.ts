import { Category } from '@/modules/categories/schemas/category.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type BookDocument = HydratedDocument<Book>;

@Schema({ timestamps: true })
export class Book {
  @Prop()
  thumbnail: string;

  @Prop()
  slider: string[];

  @Prop()
  mainText: string;

  @Prop()
  author: string;

  @Prop()
  price: number;

  @Prop()
  quantity: number;

  @Prop({ default: 0 })
  sold: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Category.name })
  category: mongoose.Types.ObjectId;

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

export const BookSchema = SchemaFactory.createForClass(Book);
