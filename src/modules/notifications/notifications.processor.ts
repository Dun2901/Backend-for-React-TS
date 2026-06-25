import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import mongoose from 'mongoose';
import { NOTIFICATION_JOB, NOTIFICATION_QUEUE } from '@/common/constants/queue.constant';
import { NotificationsService } from './notifications.service';

// ─── Job payload types ─────────────────────────────────────────────────────

type CreateOrderStatusJobData = {
  userId: string;
  orderId: string;
  orderCode: string;
  statusLabel: string;
};

type CreatePaymentSuccessJobData = {
  userId: string;
  orderId: string;
  orderCode: string;
};

// ─── Processor ────────────────────────────────────────────────────────────

@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<CreateOrderStatusJobData | CreatePaymentSuccessJobData>) {
    switch (job.name) {
      case NOTIFICATION_JOB.CREATE_ORDER_STATUS:
        return this.handleCreateOrderStatusNotification(job as Job<CreateOrderStatusJobData>);
      case NOTIFICATION_JOB.CREATE_PAYMENT_SUCCESS:
        return this.handleCreatePaymentSuccessNotification(job as Job<CreatePaymentSuccessJobData>);
      default:
        this.logger.warn(`[NotificationsProcessor] Unknown job: ${job.name}`);
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  private async handleCreateOrderStatusNotification(job: Job<CreateOrderStatusJobData>) {
    const { userId, orderId, orderCode, statusLabel } = job.data;

    await this.notificationsService.createOrderStatusNotification({
      userId: new mongoose.Types.ObjectId(userId),
      orderId: new mongoose.Types.ObjectId(orderId),
      orderCode,
      statusLabel,
    });

    this.logger.log(`[${NOTIFICATION_JOB.CREATE_ORDER_STATUS}] Created: orderId=${orderId}`);
  }

  private async handleCreatePaymentSuccessNotification(job: Job<CreatePaymentSuccessJobData>) {
    const { userId, orderId, orderCode } = job.data;

    await this.notificationsService.createPaymentSuccessNotification({
      userId: new mongoose.Types.ObjectId(userId),
      orderId: new mongoose.Types.ObjectId(orderId),
      orderCode,
    });

    this.logger.log(`[${NOTIFICATION_JOB.CREATE_PAYMENT_SUCCESS}] Created: orderId=${orderId}`);
  }
}
