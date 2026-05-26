import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Book, BookDocument } from './schemas/book.schema';
import type { SoftDeleteModel } from 'mongoose-delete';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private bookModel: SoftDeleteModel<BookDocument>,
  ) {}

  async create(createBookDto: CreateBookDto, user: IUser) {
    const newBook = await this.bookModel.create({
      ...createBookDto,
      createdBy: { _id: user._id, email: user.email },
    });

    return {
      _id: newBook._id,
      createdAt: newBook.createdAt,
    };
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.bookModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.bookModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate({
        path: 'category',
        select: 'name slug',
      })
      .exec();

    return {
      meta: {
        current: currentPage, //trang hiện tại
        pageSize: limit, //số lượng bản ghi đã lấy
        pages: totalPages, //tổng số trang với điều kiện query
        total: totalItems, // tổng số phần tử (số bản ghi)
      },
      result, //kết quả query
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Book với id = ${id} không tồn tại trên hệ thống.`,
      );
    }

    return await this.bookModel.findById(id);
  }

  async update(id: string, updateBookDto: UpdateBookDto, user: IUser) {
    return await this.bookModel.updateOne(
      { _id: id },
      {
        ...updateBookDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
  }

  async remove(id: string, deletedBy?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Book với id = ${id} không tồn tại trên hệ thống.`,
      );
    }

    return await this.bookModel.delete({ _id: id }, deletedBy);
  }
}
