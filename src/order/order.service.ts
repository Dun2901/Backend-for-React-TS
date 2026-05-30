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
}
