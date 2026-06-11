import { PaymentMethod } from '../schemas/order.schema';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ShippingAddressDto {
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @IsString()
  address: string;
}

export class CheckoutDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray({ message: 'Danh sách sản phẩm được chọn không hợp lệ' })
  @ArrayNotEmpty({ message: 'Vui lòng chọn ít nhất 1 sản phẩm để đặt hàng' })
  @IsMongoId({ each: true, message: 'Mã sản phẩm được chọn không hợp lệ' })
  selectedBookIds?: string[];
}
