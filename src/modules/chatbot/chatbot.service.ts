import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Book, BookDocument } from '../books/schemas/book.schema';
import type { SoftDeleteModel } from 'mongoose-delete';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Category } from '@/modules/categories/schemas/category.schema';

export interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    @InjectModel(Book.name)
    private bookModel: SoftDeleteModel<BookDocument>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY is not defined in .env');
    }
  }

  async getAIResponse(message: string, history: ChatHistoryItem[]) {
    // 1. Check API Key
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      return 'Xin lỗi, trợ lý ảo chưa được cấu hình API Key từ Google AI Studio. Vui lòng thêm GEMINI_API_KEY vào file .env ở Backend.';
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
      // 2. Fetch books context from MongoDB
      const books = await this.bookModel.find().populate('category');

      const bookContextList = books
        .map((b) => {
          const category = b.category as unknown as Category;
          const catName = category?.name ? category.name : 'Chưa phân loại';
          return `- Sách: "${b.mainText}", Tác giả: ${b.author}, Thể loại: ${catName}, Giá: ${b.price.toLocaleString('vi-VN')}đ, Còn lại: ${b.quantity} quyển, Đã bán: ${b.sold}`;
        })
        .join('\n');

      const systemInstruction =
        `Bạn là một trợ lý bán hàng (Chatbot AI) thông minh và thân thiện của website Bookstore.\n` +
        `Nhiệm vụ của bạn là tư vấn, giải đáp thắc mắc và giới thiệu sách cho khách hàng dựa trên danh sách sách thực tế của cửa hàng được cung cấp dưới đây.\n\n` +
        `DANH SÁCH SÁCH TẠI CỬA HÀNG:\n${bookContextList}\n\n` +
        `QUY TẮC CẦN TUÂN THỦ:\n` +
        `1. Chỉ giới thiệu và tư vấn các đầu sách có trong danh sách trên. Nếu khách hàng hỏi một cuốn sách không tồn tại trong danh sách, hãy lịch sự thông báo rằng cửa hàng hiện chưa có sách đó và gợi ý một số cuốn sách có chủ đề tương tự đang có sẵn.\n` +
        `2. Xưng hô lịch sự, thân thiện. Gọi khách là "bạn" hoặc "quý khách", xưng là "Bookstore" hoặc "mình".\n` +
        `3. Luôn sẵn sàng trả lời các câu hỏi chào hỏi hoặc câu hỏi thường gặp về cửa hàng (như cách mua hàng, thanh toán qua VNPay, thời gian giao hàng...). Hãy trả lời ngắn gọn, tập trung.\n` +
        `4. Không trả lời hoặc bàn luận về các chủ đề nhạy cảm, chính trị, tôn giáo, hoặc các nội dung không liên quan đến sách và dịch vụ của cửa hàng.\n` +
        `5. Hãy viết câu trả lời bằng tiếng Việt tự nhiên và định dạng đẹp mắt (sử dụng in đậm, danh sách khi cần thiết).\n` +
        `6. QUAN TRỌNG: Đây là cuộc trò chuyện đang diễn ra. KHÔNG bắt đầu mỗi câu trả lời bằng lời chào hỏi (ví dụ: "Chào bạn!", "Xin chào!", "Rất vui được gặp bạn!"). Hãy trả lời thẳng vào nội dung câu hỏi một cách tự nhiên như trong hội thoại bình thường.`;

      // 3. Format history
      // Gemini expects: history: [{ role: 'user'|'model', parts: [{ text: string }] }]
      const formattedHistory = (history || []).map((h) => ({
        role: h.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: h.text || '' }],
      }));

      // 4. Try models with fallback mechanism
      // Model names verified from ListModels API endpoint
      const modelsToTry = [
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
      ];

      let lastError: unknown = null;
      for (const modelName of modelsToTry) {
        try {
          this.logger.log(`Attempting to call Gemini API with model: ${modelName}`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction,
          });

          const chat = model.startChat({
            history: formattedHistory,
          });

          const result = await chat.sendMessage(message);
          return result.response.text();
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Model ${modelName} failed: ${errMsg}`);
          lastError = error;
        }
      }

      throw lastError;
    } catch (error) {
      this.logger.error('Error calling Gemini API:', error);
      return 'Xin lỗi, đã xảy ra lỗi trong quá trình xử lý phản hồi từ AI. Vui lòng thử lại sau.';
    }
  }
}
