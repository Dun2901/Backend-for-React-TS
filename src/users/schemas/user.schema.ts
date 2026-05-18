import { authTypeEnum, UserRoles } from '@/enum';
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

export const UserSchema = SchemaFactory.createForClass(User);
