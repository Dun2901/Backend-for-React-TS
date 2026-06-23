import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { NotificationsGateway } from './notifications.gateway';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: SoftDeleteModel<NotificationDocument>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  private validateObjectId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Mã thông báo không hợp lệ');
    }
  }

  private async countUnreadByUserId(userId: mongoose.Types.ObjectId | string) {
    return this.notificationModel.countDocuments({
      userId,
      isRead: false,
    });
  }

  private async emitNewNotification(notification: NotificationDocument) {
    const unreadCount = await this.countUnreadByUserId(notification.userId);

    this.notificationsGateway.emitNewNotification(notification.userId, {
      notification: notification.toObject(),
      unreadCount,
    });
  }

  private async emitUnreadCount(userId: mongoose.Types.ObjectId | string) {
    const unreadCount = await this.countUnreadByUserId(userId);

    this.notificationsGateway.emitUnreadCount(userId, unreadCount);
  }

  async createOrderStatusNotification(data: {
    userId: mongoose.Types.ObjectId | string;
    orderId: mongoose.Types.ObjectId | string;
    orderCode: string;
    statusLabel: string;
  }) {
    const notification = await this.notificationModel.create({
      userId: data.userId,
      orderId: data.orderId,
      orderCode: data.orderCode,
      type: NotificationType.ORDER_STATUS,
      title: `Đơn hàng ${data.statusLabel}`,
      message: `Đơn hàng ${data.orderCode} ${data.statusLabel.toLowerCase()}.`,
    });

    await this.emitNewNotification(notification);

    return notification;
  }

  async createPaymentSuccessNotification(data: {
    userId: mongoose.Types.ObjectId | string;
    orderId: mongoose.Types.ObjectId | string;
    orderCode: string;
  }) {
    const notification = await this.notificationModel.create({
      userId: data.userId,
      orderId: data.orderId,
      orderCode: data.orderCode,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Thanh toán thành công',
      message: `Bạn đã thanh toán thành công đơn hàng ${data.orderCode}.`,
    });

    await this.emitNewNotification(notification);

    return notification;
  }

  async findMyNotifications(user: IUser, currentPage: number, limit: number, isRead?: string) {
    const current = Number(currentPage) || 1;
    const pageSize = Number(limit) || 10;
    const skip = (current - 1) * pageSize;

    const filter: Record<string, unknown> = {
      userId: user._id,
    };

    if (isRead === 'true') {
      filter.isRead = true;
    }

    if (isRead === 'false') {
      filter.isRead = false;
    }

    const [result, totalItems] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),

      this.notificationModel.countDocuments(filter),
    ]);

    return {
      meta: {
        current,
        pageSize,
        pages: Math.ceil(totalItems / pageSize),
        total: totalItems,
      },
      result,
    };
  }

  async countMyUnread(user: IUser) {
    const total = await this.notificationModel.countDocuments({
      userId: user._id,
      isRead: false,
    });

    return { total };
  }

  async markRead(id: string, user: IUser) {
    this.validateObjectId(id);

    const notification = await this.notificationModel.findById(id);

    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại');
    }

    if (notification.userId.toString() !== user._id.toString()) {
      throw new ForbiddenException('Bạn không có quyền đọc thông báo này');
    }

    if (notification.isRead) {
      return notification;
    }

    notification.isRead = true;
    notification.readAt = new Date();

    const savedNotification = await notification.save();

    await this.emitUnreadCount(user._id);

    return savedNotification;
  }

  async markAllRead(user: IUser) {
    await this.notificationModel.updateMany(
      {
        userId: user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    await this.emitUnreadCount(user._id);

    return { success: true };
  }
}
