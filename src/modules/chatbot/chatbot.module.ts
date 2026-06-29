import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { Book, BookSchema } from '../books/schemas/book.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }])],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
