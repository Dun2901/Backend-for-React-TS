import { Book, BookDocument } from '@/books/schemas/book.schema';
import { User, UserDocument } from '@/users/schemas/user.schema';
import { UsersService } from '@/users/users.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { listBooks, listCategories, listUsers } from './init/sample.data';
import {
  Category,
  CategoryDocument,
} from '@/categories/schemas/category.schema';

@Injectable()
export class DatabasesService implements OnModuleInit {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Book.name) private bookModel: SoftDeleteModel<BookDocument>,
    @InjectModel(Category.name)
    private categoryModel: SoftDeleteModel<CategoryDocument>,

    private configService: ConfigService,
    private userService: UsersService,
  ) {}

  async onModuleInit() {
    const isInit = this.configService.get<string>('SHOULD_INIT');
    if (isInit) {
      const countUser = await this.userModel.countDocuments({});
      const countBook = await this.bookModel.countDocuments({});
      const countCategory = await this.categoryModel.countDocuments({});

      if (countUser === 0) {
        const hashedPassword = await this.userService.getHashPassword(
          this.configService.get<string>('INIT_PASSWORD') ?? '',
        );
        const users = listUsers.map((item) => ({
          ...item,
          password: hashedPassword,
        }));
        await this.userModel.insertMany(users);
      }

      if (countCategory === 0)
        await this.categoryModel.insertMany(listCategories);
      if (countBook === 0) {
        const categories = await this.categoryModel.find();
        const categoryMap = new Map(categories.map((c) => [c.slug, c._id]));

        const books = listBooks.map(({ categorySlug, ...rest }) => ({
          ...rest,
          category: categoryMap.get(categorySlug),
        }));

        await this.bookModel.insertMany(books);
      }

      if (countUser > 0) {
        this.logger.log('>>> ALREADY INIT SAMPLE DATA...');
      } else {
        this.logger.log('>>> SUCCESS INIT SAMPLE DATA...');
      }
    }
  }
}
