import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({
  timestamps: true,
})
export class Category {
  @Prop({
    trim: true,
  })
  name: string;

  @Prop({
    unique: true,
    trim: true,
    lowercase: true,
  })
  slug: string;

  @Prop({
    default: '',
    trim: true,
  })
  description: string;

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

export const CategorySchema = SchemaFactory.createForClass(Category);
