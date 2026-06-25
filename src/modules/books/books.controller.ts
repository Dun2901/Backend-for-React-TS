import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Public, ResponseMessage, Roles, User } from '@/common/decorators/customize';
import { UserRoles } from '@/common/enums';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @ApiOperation({ summary: 'Admin tạo sách mới' })
  @ApiBearerAuth('access-token')
  @Post()
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Create a book')
  create(@Body() createBookDto: CreateBookDto, @User() user: IUser) {
    return this.booksService.create(createBookDto, user);
  }

  @ApiOperation({ summary: 'Lấy danh sách sách có phân trang, tìm kiếm và lọc' })
  @Public()
  @UseInterceptors(CacheInterceptor)
  @Get()
  @ResponseMessage('Fetch book with paginate')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.booksService.findAll(+currentPage, +limit, qs);
  }

  @ApiOperation({ summary: 'Lấy chi tiết sách theo ID' })
  @ApiParam({ name: 'id', example: '667a1c2b3d4e5f6789012345', description: 'ID sách' })
  @Public()
  @UseInterceptors(CacheInterceptor)
  @Get(':id')
  @ResponseMessage('Fetch book by id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @ApiOperation({ summary: 'Admin cập nhật thông tin sách' })
  @ApiParam({ name: 'id', example: '667a1c2b3d4e5f6789012345', description: 'ID sách' })
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Update a book')
  update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto, @User() user: IUser) {
    return this.booksService.update(id, updateBookDto, user);
  }

  @ApiOperation({ summary: 'Admin xóa  sách' })
  @ApiParam({ name: 'id', example: '667a1c2b3d4e5f6789012345', description: 'ID sách' })
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Delete a book')
  remove(@Param('id') id: string, @User() user: IUser): Promise<any> {
    return this.booksService.remove(id, user._id);
  }
}
