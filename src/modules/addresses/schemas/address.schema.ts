import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: true })
export class Address {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  provinceCode: string;

  @Prop({ required: true, trim: true })
  provinceName: string;

  @Prop({ required: true, trim: true })
  wardCode: string;

  @Prop({ required: true, trim: true })
  wardName: string;

  @Prop({ required: true, trim: true })
  addressLine: string;

  @Prop({ required: true, trim: true })
  fullAddress: string;

  @Prop({ default: false, index: true })
  isDefault: boolean;

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
}

export const AddressSchema = SchemaFactory.createForClass(Address);

AddressSchema.index({ userId: 1, createdAt: -1 });
AddressSchema.index({ userId: 1, isDefault: 1 });
AddressSchema.index({ provinceCode: 1, wardCode: 1 });
