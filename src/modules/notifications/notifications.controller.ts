import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ResponseMessage, User } from '@/common/decorators/customize';
import { NotificationsService } from './notifications.service';

@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  @ResponseMessage('Lấy danh sách thông báo thành công')
  findMyNotifications(
    @User() user: IUser,
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query('isRead') isRead?: string,
  ) {
    return this.notificationsService.findMyNotifications(user, +currentPage, +limit, isRead);
  }

  @Get('unread-count')
  @ResponseMessage('Lấy số thông báo chưa đọc thành công')
  countMyUnread(@User() user: IUser) {
    return this.notificationsService.countMyUnread(user);
  }

  @Patch(':id/read')
  @ResponseMessage('Đánh dấu đã đọc thông báo thành công')
  markRead(@Param('id') id: string, @User() user: IUser) {
    return this.notificationsService.markRead(id, user);
  }

  @Patch('read-all')
  @ResponseMessage('Đánh dấu tất cả thông báo đã đọc thành công')
  markAllRead(@User() user: IUser) {
    return this.notificationsService.markAllRead(user);
  }
}
