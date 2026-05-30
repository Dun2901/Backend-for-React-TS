import { authTypeEnum, UserRoles } from '@/common/enums';
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

  @Prop({ enum: UserRoles, default: UserRoles.USER })
  role: UserRoles;

  @Prop({ default: 'default-user.png' })
  avatar: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ enum: authTypeEnum, default: authTypeEnum.LOCAL })
  accountType: authTypeEnum;

  @Prop()
  codeId: string;

  @Prop()
  codeExpired: Date;

  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpired: Date;

  @Prop()
  passwordChangeAt: Date;

  @Prop()
  hashedRefreshToken: string;

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

export const UserSchema = SchemaFactory.createForClass(User);
