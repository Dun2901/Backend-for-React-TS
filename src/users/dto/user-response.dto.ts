import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  _id: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;

  @Expose()
  phone: number;

  @Expose()
  role: string;

  @Expose()
  avatar: string;

  @Expose()
  isActive: boolean;

  @Expose()
  accountType: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
