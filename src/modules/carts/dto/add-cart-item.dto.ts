import { IsInt, IsMongoId, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @IsMongoId({ message: 'bookId phải là MongoId hợp lệ' })
  bookId: string;

  @Type(() => Number)
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'quantity phải >= 1' })
  quantity: number;
}
