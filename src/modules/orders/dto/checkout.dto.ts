import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../schemas/order.schema';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ShippingAddressDto {
  @ApiProperty({
    example: 'Nguyễn Văn An',
    description: 'Họ tên người nhận hàng',
  })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString()
  fullName: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại người nhận',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  phone: string;

  @ApiProperty({
    example: '12 Nguyễn Văn Bảo, Phường Hạnh Thông, TP. Hồ Chí Minh',
    description: 'Địa chỉ giao hàng đầy đủ',
  })
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @IsString()
  address: string;
}

export class CheckoutDto {
  @ApiProperty({
    type: ShippingAddressDto,
    description: 'Thông tin địa chỉ giao hàng',
  })
  @IsDefined({ message: 'Địa chỉ giao hàng không được để trống' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.COD,
    description: 'Phương thức thanh toán',
  })
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: 'Giao giờ hành chính giúp tôi',
    description: 'Ghi chú đơn hàng',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    example: ['667a1c2b3d4e5f6789012345'],
    description: 'Danh sách ID sách được chọn để thanh toán',
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách sản phẩm được chọn không hợp lệ' })
  @ArrayNotEmpty({ message: 'Vui lòng chọn ít nhất 1 sản phẩm để đặt hàng' })
  @IsMongoId({ each: true, message: 'Mã sản phẩm được chọn không hợp lệ' })
  selectedBookIds?: string[];
}
