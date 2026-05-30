import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsNotEmpty({ message: 'fullName không được để trống' })
  fullName: string;

  @IsNotEmpty({ message: 'phone không được để trống' })
  phone: string;

  @IsOptional()
  avatar: string;
}
