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

  @Prop()
  category: string;

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  /*
   * createdAt, updatedAt, _id => có timestamps: true thì 3 field này mongoose tự thêm
   * soft-delete deletedAt, deletedBy, deleted => plugin mongoose-delete lo
   */
}

export const BookSchema = SchemaFactory.createForClass(Book);
