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
  @ApiProperty({
    example: 'Nguyễn Văn An',
    description: 'Họ tên người dùng',
  })
  @IsNotEmpty({ message: 'fullName không được để trống' })
  fullName: string;

  @ApiProperty({
    example: 'user@gmail.com',
    description: 'Email đăng ký tài khoản',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu tài khoản',
  })
  @IsNotEmpty({ message: 'Password không được để trống' })
  password: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại người dùng',
  })
  @IsNotEmpty({ message: 'Phone không được để trống' })
  phone: number;
}

export class VerifyCodeDto {
  @ApiProperty({
    example: '667a1c2b3d4e5f6789012345',
    description: 'ID của người dùng',
  })
  @IsNotEmpty({ message: '_id không được để trống' })
  _id: string;

  @ApiProperty({
    example: 'b98de39e-2626-47f1-beeb-8ffded236b7c',
    description: 'Mã xác thực được gửi qua email',
  })
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
