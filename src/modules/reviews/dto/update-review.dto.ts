import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReviewMediaType } from '../schemas/review.schema';

export class UpdateReviewMediaDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsEnum(ReviewMediaType)
  type: ReviewMediaType;
}

export class UpdateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rating phải là số nguyên' })
  @Min(1, { message: 'Rating tối thiểu là 1 sao' })
  @Max(5, { message: 'Rating tối đa là 5 sao' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1500, { message: 'Bình luận tối đa 1500 ký tự' })
  comment?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReviewMediaDto)
  media?: UpdateReviewMediaDto[];
}
