import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service';
import { ResponseMessage, User } from '@/common/decorators/customize';
import { QueryHistoryDto } from './dto/query-history.dto';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ResponseMessage('Lấy lịch sử mua hàng thành công')
  findMyOrders(@Query() query: QueryHistoryDto, @User() user: IUser) {
    return this.historyService.findMyOrders(query, user);
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết đơn hàng thành công')
  findOne(@Param('id') id: string, @User() user: IUser) {
    return this.historyService.findOne(id, user);
  }
}
