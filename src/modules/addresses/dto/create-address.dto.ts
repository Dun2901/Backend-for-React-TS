import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty({ message: 'Họ tên người nhận không được để trống' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Số điện thoại phải đúng 10 chữ số' })
  phone: string;

  @IsNotEmpty({ message: 'Mã tỉnh/thành phố không được để trống' })
  @IsString()
  provinceCode: string;

  @IsNotEmpty({ message: 'Mã phường/xã/đặc khu không được để trống' })
  @IsString()
  wardCode: string;

  @IsNotEmpty({ message: 'Địa chỉ cụ thể không được để trống' })
  @IsString()
  addressLine: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
