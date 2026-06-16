import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { buildClientRedirectUrl } from '@/common/utils/app-url.util';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@/modules/orders/schemas/order.schema';

interface ISendMailPayload {
  email: string;
  fullName: string;
  codeId: string;
}

type OrderMailItem = {
  bookName: string;
  quantity: number;
  price: number;
};

type OrderMailUser =
  | string
  | { toString: () => string }
  | {
      fullName?: string;
      email?: string;
    };

type OrderMailData = {
  _id?: { toString: () => string } | string;
  orderCode: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    address?: string;
  };
  items?: OrderMailItem[];
  userId?: OrderMailUser;
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Chờ xác nhận',
  [OrderStatus.CONFIRMED]: 'Đã xác nhận',
  [OrderStatus.SHIPPING]: 'Đang giao',
  [OrderStatus.COMPLETED]: 'Hoàn thành',
  [OrderStatus.CANCELLED]: 'Đã hủy',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.COD]: 'Thanh toán khi nhận hàng',
  [PaymentMethod.ONLINE]: 'VNPay',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: 'Chưa thanh toán',
  [PaymentStatus.PAID]: 'Đã thanh toán',
  [PaymentStatus.REFUNDED]: 'Đã hoàn tiền',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value || 0));
};

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<IConfigService>,
  ) {}

  async sendVerificationEmail(user: ISendMailPayload) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Xác thực tài khoản của bạn',
      template: 'verify-email',
      context: {
        name: user?.fullName ?? user.email,
        code: user.codeId,
        expiredIn: '5 phút',
      },
    });
  }

  async sendResetPasswordEmail(user: ISendMailPayload) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Đặt lại mật khẩu của bạn',
      template: 'reset-password',
      context: {
        name: user?.fullName ?? user.email,
        code: user.codeId,
        expiredIn: '5 phút',
      },
    });
  }

  async sendOrderStatusEmail(order: OrderMailData, userEmail: string) {
    await this.mailerService.sendMail({
      to: userEmail,
      subject: `Cập nhật trạng thái đơn hàng ${order.orderCode}`,
      template: 'order-status',
      context: this.buildOrderMailContext(order, userEmail),
    });
  }

  async sendPaymentSuccessEmail(order: OrderMailData, userEmail: string) {
    await this.mailerService.sendMail({
      to: userEmail,
      subject: `Thanh toán thành công đơn hàng ${order.orderCode}`,
      template: 'payment-success',
      context: this.buildOrderMailContext(order, userEmail),
    });
  }

  private getOrderUserFullName(order: OrderMailData) {
    const user = order.userId;

    if (user && typeof user === 'object' && 'fullName' in user) {
      return user.fullName;
    }

    return undefined;
  }

  private buildOrderMailContext(order: OrderMailData, userEmail: string) {
    const orderId = order._id?.toString();
    const orderUrl = orderId
      ? buildClientRedirectUrl(this.configService, `/orders/${orderId}`)
      : '';

    return {
      name: order.shippingAddress?.fullName || this.getOrderUserFullName(order) || userEmail,
      orderCode: order.orderCode,
      status: order.status,
      statusLabel: ORDER_STATUS_LABEL[order.status] || order.status,
      paymentMethod: order.paymentMethod,
      paymentMethodLabel: PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentStatusLabel: PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus,
      totalPrice: order.totalPrice,
      totalPriceText: formatCurrency(order.totalPrice),
      orderUrl,
      shippingAddress: order.shippingAddress,
      items: (order.items || []).map((item) => ({
        bookName: item.bookName,
        quantity: item.quantity,
        priceText: formatCurrency(item.price),
        subtotalText: formatCurrency(item.price * item.quantity),
      })),
    };
  }
}
