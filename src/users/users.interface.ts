import mongoose from 'mongoose';

export interface IUser {
  _id: mongoose.Schema.Types.ObjectId;
  fullName: string;
  email: string;
  role: string;
}
