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
import { OrdersService } from '../orders/orders.service';
import { PaymentMethod, PaymentStatus } from '../orders/schemas/order.schema';

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

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const paymentUrl = this.vnpayService.buildPaymentUrl({
      vnp_Amount: order.totalPrice,
      vnp_IpAddr: ip,
      vnp_TxnRef: order.orderCode,
      vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: this.configService.getOrThrow<string>('VNPAY_RETURN_URL'),
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

      if (order && order.paymentStatus !== PaymentStatus.PAID) {
        await this.ordersService.markPaid(order._id.toString());
      }

      return {
        success: true,
        message: 'Thanh toán thành công',
        orderCode: verify.vnp_TxnRef,
      };
    } catch {
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

      if (!verify.isVerified) {
        return IpnFailChecksum;
      }

      const order = await this.ordersService.findByOrderCode(verify.vnp_TxnRef);

      if (!order) {
        return IpnOrderNotFound;
      }

      if (verify.vnp_Amount !== order.totalPrice) {
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
    } catch {
      return IpnUnknownError;
    }
  }
}
