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
import { ApiBearerAuth } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @ApiBearerAuth('access-token')
  @Post()
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Create a book')
  create(@Body() createBookDto: CreateBookDto, @User() user: IUser) {
    return this.booksService.create(createBookDto, user);
  }

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

  @Public()
  @UseInterceptors(CacheInterceptor)
  @Get(':id')
  @ResponseMessage('Fetch book by id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @Patch(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Update a book')
  update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto, @User() user: IUser) {
    return this.booksService.update(id, updateBookDto, user);
  }

  @ApiBearerAuth('access-token')
  @Delete(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Delete a book')
  remove(@Param('id') id: string, @User() user: IUser): Promise<any> {
    return this.booksService.remove(id, user._id);
  }
}
