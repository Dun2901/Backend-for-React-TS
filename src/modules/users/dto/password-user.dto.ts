import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Code không được để trống' })
  codeId: string;

  @IsNotEmpty({ message: 'newPassword không được để trống' })
  newPassword: string;

  @IsNotEmpty({ message: 'confirmPassword không được để trống' })
  confirmPassword: string;
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'oldPassword không được để trống' })
  oldPassword: string;

  @IsNotEmpty({ message: 'newPassword không được để trống' })
  newPassword: string;
}
