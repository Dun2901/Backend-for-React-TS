import { Book, BookDocument } from '@/modules/books/schemas/book.schema';
import { Category, CategoryDocument } from '@/modules/categories/schemas/category.schema';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { UsersService } from '@/modules/users/users.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { listBooks, listCategories, listUsers } from './init/sample.data';
import { uploadBookImagesToCloudinary } from './init/cloudinary-seed.util';

@Injectable()
export class DatabasesService implements OnModuleInit {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: SoftDeleteModel<UserDocument>,

    @InjectModel(Book.name)
    private bookModel: SoftDeleteModel<BookDocument>,

    @InjectModel(Category.name)
    private categoryModel: SoftDeleteModel<CategoryDocument>,

    private configService: ConfigService,
    private userService: UsersService,
  ) {}

  async onModuleInit() {
    const shouldInit = this.isShouldInit();

    if (!shouldInit) {
      return;
    }

    const countUser = await this.userModel.countDocuments({});
    const countBook = await this.bookModel.countDocuments({});
    const countCategory = await this.categoryModel.countDocuments({});

    if (countUser === 0) {
      await this.seedUsers();
    }

    if (countCategory === 0) {
      await this.seedCategories();
    }

    if (countBook === 0) {
      await this.seedBooks();
    }

    if (countUser > 0 || countBook > 0 || countCategory > 0) {
      this.logger.log('>>> SAMPLE DATA ALREADY EXISTS...');
    } else {
      this.logger.log('>>> SUCCESS INIT SAMPLE DATA...');
    }
  }

  private isShouldInit() {
    const value = this.configService.get<string>('SHOULD_INIT');

    return value === 'true' || value === '1';
  }

  private async seedUsers() {
    const hashedPassword = await this.userService.getHashPassword(
      this.configService.get<string>('INIT_PASSWORD') ?? '',
    );

    const users = listUsers.map((item) => ({
      ...item,
      password: hashedPassword,
    }));

    await this.userModel.insertMany(users);

    this.logger.log('>>> SUCCESS INIT USERS...');
  }

  private async seedCategories() {
    await this.categoryModel.insertMany(listCategories);

    this.logger.log('>>> SUCCESS INIT CATEGORIES...');
  }

  private async seedBooks() {
    const categories = await this.categoryModel.find();
    const categoryMap = new Map(categories.map((c) => [c.slug, c._id]));

    const cloudinaryFolder =
      this.configService.get<string>('CLOUDINARY_FOLDER') || 'bookstore/books';

    const seedImageRoot =
      this.configService.get<string>('CLOUDINARY_SEED_IMAGE_ROOT') || 'public/images/book';

    const books = await Promise.all(
      listBooks.map(async ({ categorySlug, ...rest }) => {
        const categoryId = categoryMap.get(categorySlug);

        if (!categoryId) {
          throw new Error(`Không tìm thấy category với slug: ${categorySlug}`);
        }

        const bookWithCloudinaryImages = await uploadBookImagesToCloudinary(rest, {
          folder: cloudinaryFolder,
          rootDir: seedImageRoot,
        });

        return {
          ...bookWithCloudinaryImages,
          category: categoryId,
        };
      }),
    );

    await this.bookModel.insertMany(books);

    this.logger.log('>>> SUCCESS INIT BOOKS WITH CLOUDINARY IMAGES...');
  }
}
