import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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
  phone: string;

  @Prop()
  role: string;

  @Prop()
  avatar: string;

  @Prop()
  isActive: boolean;

  @Prop()
  type: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
