import { Controller, Post, Body } from '@nestjs/common';
import { ChatbotService, ChatHistoryItem } from './chatbot.service';
import { Public, ResponseMessage } from '@/common/decorators/customize';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

class AskAiDto {
  @IsString()
  @IsNotEmpty({ message: 'Tin nhắn không được để trống' })
  message: string;

  @IsArray()
  @IsOptional()
  history: ChatHistoryItem[];
}

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Public()
  @Post('chat')
  @ResponseMessage('Lấy phản hồi từ AI thành công')
  async askAI(@Body() askAiDto: AskAiDto) {
    const { message, history } = askAiDto;
    const response = await this.chatbotService.getAIResponse(message, history || []);
    return { response };
  }
}
