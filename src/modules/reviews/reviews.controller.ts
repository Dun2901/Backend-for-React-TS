import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Public, ResponseMessage, User } from '@/common/decorators/customize';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth('access-token')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @ResponseMessage('Tạo đánh giá thành công')
  create(@Body() createReviewDto: CreateReviewDto, @User() user: IUser) {
    return this.reviewsService.create(createReviewDto, user);
  }

  @ApiBearerAuth('access-token')
  @Get('book/:bookId/me')
  @ResponseMessage('Lấy đánh giá của tôi cho sách thành công')
  findMyReviewsByBook(@Param('bookId') bookId: string, @User() user: IUser) {
    return this.reviewsService.findMyReviewsByBook(bookId, user);
  }

  @Public()
  @Get('book/:bookId')
  @ResponseMessage('Lấy danh sách đánh giá của sách thành công')
  findByBook(@Param('bookId') bookId: string, @Query() query: QueryReviewDto) {
    return this.reviewsService.findByBook(bookId, query);
  }

  @ApiBearerAuth('access-token')
  @Get('my-pending')
  @ResponseMessage('Lấy danh sách sách chờ đánh giá thành công')
  findMyPending(@User() user: IUser) {
    return this.reviewsService.findMyPending(user);
  }

  @ApiBearerAuth('access-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch(':id')
  @ResponseMessage('Cập nhật đánh giá thành công')
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto, @User() user: IUser) {
    return this.reviewsService.update(id, updateReviewDto, user);
  }

  @ApiBearerAuth('access-token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Patch(':id/helpful')
  @ResponseMessage('Cập nhật trạng thái hữu ích thành công')
  markHelpful(@Param('id') id: string, @User() user: IUser) {
    return this.reviewsService.markHelpful(id, user);
  }

  @ApiBearerAuth('access-token')
  @Delete(':id')
  @ResponseMessage('Xóa đánh giá thành công')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.reviewsService.remove(id, user);
  }
}
