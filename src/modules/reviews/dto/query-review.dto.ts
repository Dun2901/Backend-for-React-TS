import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  current?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasMedia?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasComment?: boolean;

  @IsOptional()
  @IsIn(['newest', 'oldest', 'rating_desc', 'rating_asc'])
  sort?: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc' = 'newest';
}
