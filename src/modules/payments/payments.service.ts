import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { VnpayService } from 'nestjs-vnpay';
import {
  IpnFailChecksum,
  IpnInvalidAmount,
  IpnOrderNotFound,
  IpnSuccess,
  IpnUnknownError,
  InpOrderAlreadyConfirmed,
  ProductCode,
  ReturnQueryFromVNPay,
  VnpLocale,
} from 'vnpay';
import { getVnpayReturnUrl } from '@/common/utils/app-url.util';
import { OrdersService } from '../orders/orders.service';
import { PaymentMethod, PaymentStatus } from '../orders/schemas/order.schema';

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  const rawIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0] ||
      req.headers['x-real-ip']?.toString() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

  const ip = rawIp.trim().replace('::ffff:', '');

  /**
   * Qua devtunnel / proxy / mobile browser đôi khi IP sẽ là IPv6:
   * ::1, 2402:800:..., ...
   *
   * VNPay sandbox đôi khi xử lý IPv6 không ổn.
   * Dùng 127.0.0.1 cho môi trường test là an toàn nhất.
   */
  if (!ip || ip === '::1' || ip.includes(':')) {
    return '127.0.0.1';
  }

  return ip;
};

const isSameAmount = (vnpAmount: unknown, orderAmount: unknown) => {
  const amountFromVnpay = Number(vnpAmount);
  const amountFromOrder = Number(orderAmount);

  if (!Number.isFinite(amountFromVnpay) || !Number.isFinite(amountFromOrder)) {
    return false;
  }

  /**
   * Tùy version thư viện, vnp_Amount có thể là:
   * - 604000
   * - hoặc 60400000 vì VNPay nhân 100
   *
   * Check cả 2 để tránh báo sai số tiền.
   */
  return amountFromVnpay === amountFromOrder || amountFromVnpay / 100 === amountFromOrder;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly vnpayService: VnpayService,
    private readonly configService: ConfigService<IConfigService>,
    private readonly ordersService: OrdersService,
  ) {}

  async createPaymentUrl(orderId: string, req: Request, user: IUser) {
    const order = await this.ordersService.findById(orderId);

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.userId.toString() !== user._id.toString()) {
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn hàng này');
    }

    if (order.paymentMethod !== PaymentMethod.ONLINE) {
      throw new BadRequestException('Đơn hàng này không phải thanh toán online');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Đơn hàng đã được thanh toán');
    }

    const ip = getClientIp(req);
    const returnUrl = getVnpayReturnUrl(this.configService);

    console.log('[VNPay create-payment-url]', {
      orderCode: order.orderCode,
      amount: order.totalPrice,
      ip,
      returnUrl,
    });

    const paymentUrl = this.vnpayService.buildPaymentUrl({
      vnp_Amount: Number(order.totalPrice),
      vnp_IpAddr: ip,
      vnp_TxnRef: order.orderCode,
      vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
    });

    return {
      paymentUrl,
      orderCode: order.orderCode,
    };
  }

  async vnpayReturn(query: Record<string, string>) {
    try {
      const verify = await this.vnpayService.verifyReturnUrl(
        query as unknown as ReturnQueryFromVNPay,
      );

      console.log('[VNPay return]', {
        isVerified: verify.isVerified,
        isSuccess: verify.isSuccess,
        orderCode: verify.vnp_TxnRef,
        amount: verify.vnp_Amount,
        responseCode: verify.vnp_ResponseCode,
        transactionStatus: verify.vnp_TransactionStatus,
      });

      if (!verify.isVerified) {
        return {
          success: false,
          message: 'Dữ liệu thanh toán không hợp lệ',
        };
      }

      if (!verify.isSuccess) {
        return {
          success: false,
          message: 'Thanh toán thất bại',
          orderCode: verify.vnp_TxnRef,
        };
      }

      const order = await this.ordersService.findByOrderCode(verify.vnp_TxnRef);

      if (!order) {
        return {
          success: false,
          message: 'Không tìm thấy đơn hàng',
          orderCode: verify.vnp_TxnRef,
        };
      }

      if (!isSameAmount(verify.vnp_Amount, order.totalPrice)) {
        return {
          success: false,
          message: 'Số tiền thanh toán không hợp lệ',
          orderCode: verify.vnp_TxnRef,
        };
      }

      if (order.paymentStatus !== PaymentStatus.PAID) {
        await this.ordersService.markPaid(order._id.toString());
      }

      return {
        success: true,
        message: 'Thanh toán thành công',
        orderCode: verify.vnp_TxnRef,
      };
    } catch (error) {
      console.log('[VNPay return error]', error);

      return {
        success: false,
        message: 'Dữ liệu thanh toán không hợp lệ',
      };
    }
  }

  async vnpayIpn(query: Record<string, string>) {
    try {
      const verify = await this.vnpayService.verifyIpnCall(
        query as unknown as ReturnQueryFromVNPay,
      );

      console.log('[VNPay IPN]', {
        isVerified: verify.isVerified,
        isSuccess: verify.isSuccess,
        orderCode: verify.vnp_TxnRef,
        amount: verify.vnp_Amount,
        responseCode: verify.vnp_ResponseCode,
        transactionStatus: verify.vnp_TransactionStatus,
      });

      if (!verify.isVerified) {
        return IpnFailChecksum;
      }

      const order = await this.ordersService.findByOrderCode(verify.vnp_TxnRef);

      if (!order) {
        return IpnOrderNotFound;
      }

      if (!isSameAmount(verify.vnp_Amount, order.totalPrice)) {
        return IpnInvalidAmount;
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        return InpOrderAlreadyConfirmed;
      }

      if (!verify.isSuccess) {
        return IpnUnknownError;
      }

      await this.ordersService.markPaid(order._id.toString());

      return IpnSuccess;
    } catch (error) {
      console.log('[VNPay IPN error]', error);

      return IpnUnknownError;
    }
  }
}
