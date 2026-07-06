import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/book.jpg',
    description: 'Ảnh đại diện của sách',
  })
  @IsNotEmpty({ message: 'thumbnail không được để trống' })
  thumbnail: string;

  @ApiProperty({
    example: ['https://res.cloudinary.com/demo/image/upload/book-1.jpg'],
    description: 'Danh sách ảnh phụ của sách',
  })
  @IsNotEmpty({ message: 'slider không được để trống' })
  @IsArray()
  @IsString({ each: true }) // "each" tells class-validator to run the validation on each item of the array
  @ArrayMinSize(1)
  slider: string[];

  @ApiProperty({
    example: 'Nhà giả kim',
    description: 'Tên sách',
  })
  @IsNotEmpty({ message: 'mainText không được để trống' })
  mainText: string;

  @ApiProperty({
    example: 'Paulo Coelho',
    description: 'Tác giả',
  })
  @IsNotEmpty({ message: 'author không được để trống' })
  author: string;

  @ApiProperty({
    example: 89000,
    description: 'Giá bán',
  })
  @IsNotEmpty({ message: 'price không được để trống' })
  @IsNumber({}, { message: 'price phải có định dạng là số nguyên' })
  @Min(0, { message: 'price phải lớn hơn hoặc bằng 0' })
  price: number;

  @ApiProperty({
    example: 100,
    description: 'Số lượng tồn kho',
  })
  @IsNotEmpty({ message: 'quantity không được để trống' })
  @IsNumber({}, { message: 'quantity phải có định dạng là số nguyên' })
  @Min(0, { message: 'quantity phải lớn hơn hoặc bằng 0' })
  quantity: number;

  @ApiProperty({
    example: '667a1c2b3d4e5f6789012345',
    description: 'ID danh mục sách',
  })
  @IsNotEmpty({ message: 'category không được để trống' })
  @IsMongoId({ message: 'category không hợp lệ' })
  category: string;
}
