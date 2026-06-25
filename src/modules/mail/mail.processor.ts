import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import type { SoftDeleteModel } from 'mongoose-delete';
import { MAIL_JOB, MAIL_QUEUE } from '@/common/constants/queue.constant';
import { Order, OrderDocument } from '@/modules/orders/schemas/order.schema';
import { MailService } from './mail.service';

type MailJobData = { orderId: string };

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly mailService: MailService,
    @InjectModel(Order.name) private readonly orderModel: SoftDeleteModel<OrderDocument>,
  ) {
    super();
  }

  async process(job: Job<MailJobData>) {
    switch (job.name) {
      case MAIL_JOB.SEND_ORDER_STATUS:
        return this.handleSendOrderStatusEmail(job);
      case MAIL_JOB.SEND_PAYMENT_SUCCESS:
        return this.handleSendPaymentSuccessEmail(job);
      default:
        this.logger.warn(`[MailProcessor] Unknown job: ${job.name}`);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOrderWithUser(orderId: string) {
    return this.orderModel
      .findById(orderId)
      .populate({ path: 'userId', select: 'fullName email' })
      .select('-deleted -items.deleted -shippingAddress.deleted')
      .exec();
  }

  private getUserEmail(order: OrderDocument): string | undefined {
    const user = order.userId as { email?: string };
    return user?.email;
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  private async handleSendOrderStatusEmail(job: Job<MailJobData>) {
    const { orderId } = job.data;

    const order = await this.findOrderWithUser(orderId);

    if (!order) {
      this.logger.warn(`[${MAIL_JOB.SEND_ORDER_STATUS}] Order not found: ${orderId}`);
      return;
    }

    const userEmail = this.getUserEmail(order);

    if (!userEmail) {
      this.logger.warn(`[${MAIL_JOB.SEND_ORDER_STATUS}] No email for order: ${orderId}`);
      return;
    }

    await this.mailService.sendOrderStatusEmail(order, userEmail);
    this.logger.log(`[${MAIL_JOB.SEND_ORDER_STATUS}] Sent: orderId=${orderId}`);
  }

  private async handleSendPaymentSuccessEmail(job: Job<MailJobData>) {
    const { orderId } = job.data;

    const order = await this.findOrderWithUser(orderId);

    if (!order) {
      this.logger.warn(`[${MAIL_JOB.SEND_PAYMENT_SUCCESS}] Order not found: ${orderId}`);
      return;
    }

    const userEmail = this.getUserEmail(order);

    if (!userEmail) {
      this.logger.warn(`[${MAIL_JOB.SEND_PAYMENT_SUCCESS}] No email for order: ${orderId}`);
      return;
    }

    await this.mailService.sendPaymentSuccessEmail(order, userEmail);
    this.logger.log(`[${MAIL_JOB.SEND_PAYMENT_SUCCESS}] Sent: orderId=${orderId}`);
  }
}
