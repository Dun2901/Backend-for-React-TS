import { Book, BookDocument } from '@/books/schemas/book.schema';
import { User, UserDocument } from '@/users/schemas/user.schema';
import { UsersService } from '@/users/users.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { listUsers } from './init/sample.data';

@Injectable()
export class DatabasesService implements OnModuleInit {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,

    @InjectModel(Book.name) private bookModel: SoftDeleteModel<BookDocument>,

    private configService: ConfigService,
    private userService: UsersService,
  ) {}

  async onModuleInit() {
    const isInit = this.configService.get<string>('SHOULD_INIT');
    if (isInit) {
      const countUser = await this.userModel.countDocuments({});

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

      if (countUser > 0) {
        this.logger.log('>>> ALREADY INIT SAMPLE DATA...');
      }
    }
  }
}
