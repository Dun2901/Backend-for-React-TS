import { IsNotEmpty, IsEnum } from 'class-validator';
export class CreateOrderDto {
  @IsNotEmpty({ message: 'Không được để trống tên' })
  fullName: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: number;

  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address: string;

  @IsEnum(['COD', 'VNPAY'], { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod: string;
}
