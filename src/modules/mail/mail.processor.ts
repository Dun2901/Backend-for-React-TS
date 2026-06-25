import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import type { SoftDeleteModel } from 'mongoose-delete';
import { MAIL_JOB, MAIL_QUEUE } from '@/common/constants/queue.constant';
import { Order, OrderDocument } from '@/modules/orders/schemas/order.schema';
import { MailService } from './mail.service';

type OrderMailJobData = {
  orderId: string;
};

type AuthMailJobData = {
  email: string;
  fullName: string;
  codeId: string;
};

type MailJobData = OrderMailJobData | AuthMailJobData;

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
      case MAIL_JOB.SEND_VERIFICATION_EMAIL:
        return this.handleSendVerificationEmail(job as Job<AuthMailJobData>);

      case MAIL_JOB.SEND_RESET_PASSWORD:
        return this.handleSendResetPasswordEmail(job as Job<AuthMailJobData>);

      case MAIL_JOB.SEND_ORDER_STATUS:
        return this.handleSendOrderStatusEmail(job as Job<OrderMailJobData>);

      case MAIL_JOB.SEND_PAYMENT_SUCCESS:
        return this.handleSendPaymentSuccessEmail(job as Job<OrderMailJobData>);

      default:
        this.logger.warn(`[MailProcessor] Unknown job: ${job.name}`);
        return;
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

  // ─── Auth Mail Handlers ───────────────────────────────────────────────────

  private async handleSendVerificationEmail(job: Job<AuthMailJobData>) {
    const { email, fullName, codeId } = job.data;

    await this.mailService.sendVerificationEmail({
      email,
      fullName,
      codeId,
    });

    this.logger.log(`[${MAIL_JOB.SEND_VERIFICATION_EMAIL}] Sent: email=${email}`);
  }

  private async handleSendResetPasswordEmail(job: Job<AuthMailJobData>) {
    const { email, fullName, codeId } = job.data;

    await this.mailService.sendResetPasswordEmail({
      email,
      fullName,
      codeId,
    });

    this.logger.log(`[${MAIL_JOB.SEND_RESET_PASSWORD}] Sent: email=${email}`);
  }

  // ─── Order Mail Handlers ──────────────────────────────────────────────────

  private async handleSendOrderStatusEmail(job: Job<OrderMailJobData>) {
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

  private async handleSendPaymentSuccessEmail(job: Job<OrderMailJobData>) {
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

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `[Worker completed] jobId=${job.id} name=${job.name} attempts=${job.attemptsMade}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `[Worker failed] jobId=${job?.id} name=${job?.name} attempts=${job?.attemptsMade} error=${error.message}`,
      error.stack,
    );
  }
}
