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
  phone: number;

  @Prop({ default: 'USER' })
  role: string;

  @Prop()
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
  createdAt: Date;

  @Prop()
  updateAt: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
