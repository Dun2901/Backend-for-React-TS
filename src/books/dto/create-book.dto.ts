import { BOOK_CATEGORY } from '@/enum';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @IsNotEmpty({ message: 'thumbnail không được để trống' })
  thumbnail: string;

  @IsNotEmpty({ message: 'slider không được để trống' })
  @IsArray()
  @IsString({ each: true }) // "each" tells class-validator to run the validation on each item of the array
  @ArrayMinSize(1)
  slider: string[];

  @IsNotEmpty({ message: 'mainText không được để trống' })
  mainText: string;

  @IsNotEmpty({ message: 'author không được để trống' })
  author: string;

  @IsNotEmpty({ message: 'price không được để trống' })
  @IsNumber({}, { message: 'price phải có định dạng là số nguyên' })
  @Min(0, { message: 'price phải lớn hơn hoặc bằng 0' })
  price: number;

  @IsNotEmpty({ message: 'quantity không được để trống' })
  @IsNumber({}, { message: 'quantity phải có định dạng là số nguyên' })
  @Min(0, { message: 'quantity phải lớn hơn hoặc bằng 0' })
  quantity: number;

  @IsNotEmpty({ message: 'thumbnail không được để trống' })
  @IsEnum(BOOK_CATEGORY, { message: 'category không tồn tại' })
  category: string;
}
