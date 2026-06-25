import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@gmail.com',
    description: 'Email cần gửi mã đặt lại mật khẩu',
  })
  @IsEmail()
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@gmail.com',
    description: 'Email cần đặt lại mật khẩu',
  })
  @IsEmail()
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: 'b98de39e-2626-47f1-beeb-8ffded236b7c',
    description: 'Mã xác thực đặt lại mật khẩu',
  })
  @IsString()
  @IsNotEmpty({ message: 'Code không được để trống' })
  codeId: string;

  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu mới',
  })
  @IsNotEmpty({ message: 'newPassword không được để trống' })
  newPassword: string;

  @ApiProperty({
    example: '123456',
    description: 'Xác nhận mật khẩu mới',
  })
  @IsNotEmpty({ message: 'confirmPassword không được để trống' })
  confirmPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu hiện tại',
  })
  @IsNotEmpty({ message: 'oldPassword không được để trống' })
  oldPassword: string;

  @ApiProperty({
    example: '654321',
    description: 'Mật khẩu mới',
  })
  @IsNotEmpty({ message: 'newPassword không được để trống' })
  newPassword: string;
}
