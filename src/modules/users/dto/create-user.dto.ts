import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'fullName không được để trống' })
  fullName: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsNotEmpty({ message: 'Password không được để trống' })
  password: string;

  @IsNotEmpty({ message: 'Phone không được để trống' })
  phone: number;

  @IsNotEmpty({ message: 'Role không được để trống' })
  role: string;
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

export class VerifyCodeDto {
  @IsNotEmpty({ message: '_id không được để trống' })
  _id: string;

  @IsNotEmpty({ message: 'codeId không được để trống' })
  codeId: string;
}

export class UserLoginDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @ApiProperty({
    example: 'example@gmail.com',
    description: 'Email',
  })
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu đăng nhập',
  })
  readonly password: string;
}
