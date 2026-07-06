import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import mongoose from 'mongoose';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { Book, BookDocument } from '@/modules/books/schemas/book.schema';
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '@/modules/orders/schemas/order.schema';

// ─── Types cho aggregate result ───────────────────────────────────────────────

interface RevenueAggResult {
  _id: null;
  totalRevenue: number;
}

interface ChartAggResult {
  _id: { year: number; month: number; day?: number };
  revenue: number;
  orderCount: number;
}

// ─── Type cho order sau khi lean + populate userId ────────────────────────────

interface PopulatedUser {
  fullName: string;
  email: string;
}

interface LeanOrderWithUser {
  _id: mongoose.Types.ObjectId;
  orderCode: string;
  userId: PopulatedUser | mongoose.Types.ObjectId;
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: Date; // timestamps: true — có ở runtime, khai báo thủ công ở đây
}

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Book.name) private bookModel: SoftDeleteModel<BookDocument>,
    @InjectModel(Order.name) private orderModel: SoftDeleteModel<OrderDocument>,
  ) {}

  async getSummary() {
    const revenueFilter = {
      deleted: { $ne: true },
      $or: [{ paymentStatus: PaymentStatus.PAID }, { status: OrderStatus.COMPLETED }],
    };

    const [
      totalUsers,
      totalBooks,
      totalOrders,
      pendingOrders,
      paidOrders,
      completedOrders,
      cancelledOrders,
      revenueResult,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.bookModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: OrderStatus.PENDING }),
      this.orderModel.countDocuments({ paymentStatus: PaymentStatus.PAID }),
      this.orderModel.countDocuments({ status: OrderStatus.COMPLETED }),
      this.orderModel.countDocuments({ status: OrderStatus.CANCELLED }),
      this.orderModel.aggregate<RevenueAggResult>([
        { $match: revenueFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalPrice' },
          },
        },
      ]),
    ]);

    return {
      totalUsers,
      totalBooks,
      totalOrders,
      totalRevenue: revenueResult[0]?.totalRevenue ?? 0,
      pendingOrders,
      paidOrders,
      completedOrders,
      cancelledOrders,
    };
  }

  async getLatestOrders(limit: number) {
    const safeLimit = Math.min(Math.max(limit || 5, 1), 20);

    // lean<T>() override kiểu trả về, giải quyết cả createdAt lẫn userId populate
    const orders = await this.orderModel
      .find()
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate({ path: 'userId', select: 'fullName email' })
      .select('orderCode userId totalPrice status paymentMethod paymentStatus createdAt')
      .lean<LeanOrderWithUser[]>();

    return orders.map((order) => {
      const user = order.userId instanceof mongoose.Types.ObjectId ? null : order.userId;

      return {
        _id: order._id,
        orderCode: order.orderCode,
        customerName: user?.fullName ?? 'Không rõ',
        customerEmail: user?.email,
        totalPrice: order.totalPrice,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      };
    });
  }

  async getTopSellingBooks(limit: number) {
    const safeLimit = Math.min(Math.max(limit || 5, 1), 20);

    return this.bookModel
      .find({ sold: { $gt: 0 } })
      .sort({ sold: -1 })
      .limit(safeLimit)
      .select('mainText author thumbnail price sold quantity')
      .lean();
  }

  async getRevenueChart(type: 'day' | 'month') {
    const dateGroup =
      type === 'day'
        ? {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          }
        : {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          };

    const result = await this.orderModel.aggregate<ChartAggResult>([
      {
        $match: {
          deleted: { $ne: true },
          $or: [{ paymentStatus: PaymentStatus.PAID }, { status: OrderStatus.COMPLETED }],
        },
      },
      {
        $group: {
          _id: dateGroup,
          revenue: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    return result.map((item) => ({
      label:
        type === 'day'
          ? `${item._id.day}/${item._id.month}/${item._id.year}`
          : `${item._id.month}/${item._id.year}`,
      revenue: item.revenue,
      orderCount: item.orderCount,
    }));
  }
}
