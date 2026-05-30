import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, {
    message:
      'quantity phải >= 1, muốn xóa hãy dùng DELETE /carts/items/:bookId',
  })
  quantity: number;
}
