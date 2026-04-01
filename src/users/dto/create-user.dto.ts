import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  fullName: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  phone: number;

  @IsNotEmpty()
  role: string;

  @IsNotEmpty()
  avatar: string;
}

export class RegisterUserDto {
  @IsNotEmpty({ message: 'fullName không được để trống' })
  fullName: string;

  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsNotEmpty({ message: 'Password không được để trống' })
  password: string;

  @IsNotEmpty({ message: 'Phone không được để trống' })
  phone: number;
}
