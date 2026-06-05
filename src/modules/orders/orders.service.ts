import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './schemas/order.schema';
import { Book, BookDocument } from '@/modules/books/schemas/book.schema';
import { Cart, CartDocument } from '@/modules/carts/schemas/cart.schema';
import aqp from 'api-query-params';
import type { SoftDeleteModel } from 'mongoose-delete';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, Connection } from 'mongoose';
import { UserRoles } from '@/common/enums';
import { v4 as uuidv4 } from 'uuid';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Order.name) private orderModel: SoftDeleteModel<OrderDocument>,
    @InjectModel(Book.name) private bookModel: SoftDeleteModel<BookDocument>,
    @InjectModel(Cart.name) private cartModel: SoftDeleteModel<CartDocument>,
  ) {}
  // ─── Helpers ──────────────────────────────────────────────────────────────
  private validateObjectId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ');
    }
  }

  private generateOrderCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();

    return `ORD-${dateStr}-${random}`;
  }

  private assertCanAccessOrder(order: OrderDocument, user: IUser) {
    if (user.role === (UserRoles.ADMIN as string)) {
      return;
    }
    if (order.userId.toString() !== user._id) {
      throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng này');
    }
  }

  private validateOrderStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
    /*
     * PENDING   → CONFIRMED | CANCELLED
     * CONFIRMED → SHIPPING  | CANCELLED
     * SHIPPING  → COMPLETED
     * COMPLETED → (không đổi)
     * CANCELLED → (không đổi)
     */

    if (currentStatus === nextStatus) {
      throw new BadRequestException('Trạng thái mới phải khác trạng thái hiện tại');
    }

    if (currentStatus === OrderStatus.PENDING) {
      if (nextStatus !== OrderStatus.CONFIRMED && nextStatus !== OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'Đơn hàng đang chờ xác nhận chỉ có thể chuyển sang đã xác nhận hoặc đã hủy',
        );
      }

      return;
    }

    if (currentStatus === OrderStatus.CONFIRMED) {
      if (nextStatus !== OrderStatus.SHIPPING && nextStatus !== OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'Đơn hàng đã xác nhận chỉ có thể chuyển sang đang giao hoặc đã hủy',
        );
      }

      return;
    }

    if (currentStatus === OrderStatus.SHIPPING) {
      if (nextStatus !== OrderStatus.COMPLETED) {
        throw new BadRequestException('Đơn hàng đang giao chỉ có thể chuyển sang đã hoàn thành');
      }

      return;
    }

    if (currentStatus === OrderStatus.COMPLETED) {
      throw new BadRequestException('Đơn hàng đã hoàn thành, không thể cập nhật trạng thái');
    }

    if (currentStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng đã hủy, không thể cập nhật trạng thái');
    }
  }

  private async restoreOrderStock(order: OrderDocument, session: ClientSession) {
    for (const item of order.items) {
      await this.bookModel.updateOne(
        { _id: item.bookId },
        {
          $inc: {
            quantity: item.quantity,
            sold: -item.quantity,
          },
        },
        { session },
      );
    }
  }
  // ─── Queries ─────────────────────────────────────────────────────────────
  async checkout(user: IUser, checkoutDto: CheckoutDto) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const cart = await this.cartModel
        .findOne({ userId: user._id })
        .populate('items.bookId')
        .session(session);

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Giỏ hàng đang trống');
      }

      const orderItems: {
        bookId: mongoose.Types.ObjectId;
        bookName: string;
        thumbnail?: string;
        quantity: number;
        price: number;
      }[] = [];

      let totalPrice = 0;

      for (const item of cart.items) {
        const book = item.bookId as unknown as BookDocument;
        if (!book) {
          throw new NotFoundException('Sách không tồn tại');
        }

        const updatedBook = await this.bookModel.findOneAndUpdate(
          {
            _id: book._id,
            quantity: { $gte: item.quantity },
          },
          {
            $inc: {
              quantity: -item.quantity,
              sold: item.quantity,
            },
          },
          {
            returnDocument: 'after',
            session,
          },
        );

        if (!updatedBook) {
          throw new BadRequestException(`Sách "${book.mainText}" không đủ số lượng trong kho`);
        }

        orderItems.push({
          bookId: book._id,
          bookName: book.mainText,
          thumbnail: book.thumbnail,
          quantity: item.quantity,
          price: item.priceAtAdd,
        });

        totalPrice += item.priceAtAdd * item.quantity;
      }

      const [order] = await this.orderModel.create(
        [
          {
            orderCode: this.generateOrderCode(),
            userId: user._id,
            items: orderItems,
            shippingAddress: checkoutDto.shippingAddress,
            totalPrice,
            status: OrderStatus.PENDING,
            paymentMethod: checkoutDto.paymentMethod || PaymentMethod.COD,
            paymentStatus: PaymentStatus.UNPAID,
            note: checkoutDto.note,
          },
        ],
        { session },
      );

      await this.cartModel.updateOne(
        { userId: user._id },
        {
          $set: {
            items: [],
            totalItems: 0,
            totalPrice: 0,
          },
        },
        { session },
      );

      const cleanOrder = await this.orderModel
        .findById(order._id)
        .select('-deleted -items.deleted -shippingAddress.deleted')
        .session(session);

      await session.commitTransaction();

      return cleanOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.orderModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.orderModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate({
        path: 'userId',
        select: 'fullName email',
      })
      .select('-deleted -items.deleted -shippingAddress.deleted')
      .exec();

    return {
      meta: {
        current: currentPage, //trang hiện tại
        pageSize: limit, //số lượng bản ghi đã lấy
        pages: totalPages, //tổng số trang với điều kiện query
        total: totalItems, // tổng số phần tử (số bản ghi)
      },
      result, //kết quả query
    };
  }

  async findOne(id: string, user: IUser) {
    this.validateObjectId(id);
    const order = await this.orderModel
      .findById(id)
      .select('-deleted -items.deleted -shippingAddress.deleted');
    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    this.assertCanAccessOrder(order, user);
    if (user.role === (UserRoles.ADMIN as string)) {
      await order.populate({
        path: 'userId',
        select: 'fullName email',
      });
    }
    return order;
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto, user: IUser) {
    this.validateObjectId(id);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel.findById(id).session(session);

      if (!order) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      const newStatus = updateOrderStatusDto.status;

      this.validateOrderStatusTransition(order.status, newStatus);

      if (newStatus === OrderStatus.CANCELLED) {
        await this.restoreOrderStock(order, session);
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      };

      // Khi giao thành công đơn COD, xem như khách đã thanh toán
      if (
        newStatus === OrderStatus.COMPLETED &&
        order.paymentMethod === PaymentMethod.COD &&
        order.paymentStatus === PaymentStatus.UNPAID
      ) {
        updateData.paymentStatus = PaymentStatus.PAID;
      }

      const updatedOrder = await this.orderModel
        .findOneAndUpdate(
          { _id: id },
          {
            $set: updateData,
          },
          {
            returnDocument: 'after',
            session,
            runValidators: true,
          },
        )
        .select('-deleted -items.deleted -shippingAddress.deleted');

      await session.commitTransaction();

      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async cancel(id: string, user: IUser) {
    this.validateObjectId(id);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel.findById(id).session(session);
      if (!order) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      this.assertCanAccessOrder(order, user);

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Bạn chỉ có thể hủy đơn hàng khi đơn đang chờ xác nhận');
      }

      await this.restoreOrderStock(order, session);

      const updatedOrder = await this.orderModel
        .findOneAndUpdate(
          { _id: id },
          {
            status: OrderStatus.CANCELLED,
          },
          {
            returnDocument: 'after',
            session,
          },
        )
        .select('-deleted -items.deleted -shippingAddress.deleted');

      await session.commitTransaction();

      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findById(id: string) {
    return this.orderModel.findById(id);
  }

  async findByOrderCode(orderCode: string) {
    return this.orderModel.findOne({ orderCode });
  }

  async markPaid(orderId: string) {
    return this.orderModel.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: PaymentStatus.PAID,
      },
      { returnDocument: 'after' },
    );
  }
}
