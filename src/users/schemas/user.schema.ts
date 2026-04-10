import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop()
  fullName: string;

  @Prop()
  password: string;

  @Prop()
  email: string;

  @Prop()
  phone: number;

  @Prop({ default: 'USER' })
  role: string;

  @Prop({ default: 'c21f969b5f03d33d43e04f8f136e7682.png' })
  avatar: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: 'LOCAL' })
  accountType: string;

  @Prop()
  codeId: string;

  @Prop()
  codeExpired: Date;

  @Prop()
  refreshToken: string;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
