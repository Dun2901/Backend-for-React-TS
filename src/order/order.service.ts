import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '@/order/schemas/order.schema';
import { CreateOrderDto } from '@/order/dto/create.order.dto';
import { Cart, CartDocument } from '@/carts/schemas/cart.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    //tìm giỏ hàng hiện tại của user
    const cart = await this.cartModel.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng của bạn đang trống, không thể đặt hàng!');
    }

    const { fullName, phone, address, paymentMethod } = createOrderDto;
    const newOrder = new this.orderModel({
      userId,
      fullName,
      phone,
      address,
      paymentMethod,
      items: cart.items,
      totalPrice: cart.totalPrice,
    });

    //lưu đơn hàng vào mongooDB
    const saveOrder = await newOrder.save();

    //xóa giỏ hàng của user khi đặt hàng thành công
    await this.cartModel.findOneAndUpdate(
      { userId },
      { $set: { items: [], totalItems: 0, totalPrice: 0 } },
    );
    return saveOrder;
  }

  //xem lịch sử đơn
  async findOrderHistory(userId: string, query: string) {
    const urlParams = new URLSearchParams(query);
    const currentPage = parseInt(urlParams.get('current') || '1', 10);
    const pageSize = parseInt(urlParams.get('pageSize') || '10', 10);
    const skip = (currentPage - 1) * pageSize;

    const totalItems = await this.orderModel.countDocuments({ userId: userId } as any);
    const totalPages = Math.ceil(totalItems / pageSize);

    const result = await this.orderModel
      .find({ userId: userId } as any)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: pageSize,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  // xem chi tiết đơn hàng
  async findOrderById(orderId: string, userId: string) {
    const order = await this.orderModel
      .findOne({
        _id: orderId,
        userId: userId,
      } as any)
      .exec();

    if (!order) {
      throw new BadRequestException(
        'Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập đơn hàng này!',
      );
    }

    return order;
  }
}
