import { Module } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';
import { Book, BookSchema } from '@/modules/books/schemas/book.schema';
import {
  Category,
  CategorySchema,
} from '@/modules/categories/schemas/category.schema';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Book.name, schema: BookSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    UsersModule,
  ],
  controllers: [DatabasesController],
  providers: [DatabasesService],
})
export class DatabasesModule {}
