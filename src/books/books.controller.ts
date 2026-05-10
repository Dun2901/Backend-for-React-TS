import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { ResponseMessage, User } from '@/decorator/customize';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @ResponseMessage('Create a book')
  create(@Body() createBookDto: CreateBookDto, @User() user: IUser) {
    return this.booksService.create(createBookDto, user);
  }

  @Get()
  @ResponseMessage('Fetch book with paginate')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.booksService.findAll(+currentPage, +limit, qs);
  }

  @Get(':id')
  @ResponseMessage('Fetch book by id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Update a book')
  update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
    @User() user: IUser,
  ) {
    return this.booksService.update(id, updateBookDto, user);
  }

  @Delete(':id')
  @ResponseMessage('Delete a book')
  remove(@Param('id') id: string, @User() user: IUser): Promise<any> {
    return this.booksService.remove(id, user._id);
  }
}
