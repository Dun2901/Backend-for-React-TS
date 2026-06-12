import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Book, BookDocument } from './schemas/book.schema';
import type { SoftDeleteModel } from 'mongoose-delete';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import { getPaginationMeta, getPaginationParams } from '@/common/pagination/custom.meta';

@Injectable()
export class BooksService {
  constructor(@InjectModel(Book.name) private bookModel: SoftDeleteModel<BookDocument>) {}

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
    const { filter, sort } = aqp(qs);

    delete filter.current;
    delete filter.pageSize;

    const { current, pageSize, skip } = getPaginationParams({
      currentPage,
      limit,
    });

    const finalSort = {
      ...(sort as Record<string, 1 | -1>),
      _id: -1 as const,
    };

    const [result, totalItems] = await Promise.all([
      this.bookModel
        .find(filter)
        .skip(skip)
        .limit(pageSize)
        .sort(finalSort)
        .populate({
          path: 'category',
          select: 'name slug',
        })
        .exec(),

      this.bookModel.countDocuments(filter),
    ]);

    return {
      meta: getPaginationMeta({
        current,
        pageSize,
        total: totalItems,
      }),
      result,
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Book với id = ${id} không tồn tại trên hệ thống.`);
    }

    return await this.bookModel.findById(id).populate('category');
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
      throw new BadRequestException(`Book với id = ${id} không tồn tại trên hệ thống.`);
    }

    return await this.bookModel.delete({ _id: id }, deletedBy);
  }
}
