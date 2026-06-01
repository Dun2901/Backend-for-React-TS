import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { QueryHistoryDto } from './dto/query-history.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

const HISTORY_SELECT_FIELDS =
  '-deleted -__v -items.deleted -shippingAddress.deleted';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: SoftDeleteModel<OrderDocument>,
  ) {}

  async findMyOrders(query: QueryHistoryDto, user: IUser) {
    const { current, pageSize, skip } = this.getPagination(query);

    const filter = this.buildFilter(query, user._id);

    const [result, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .select(HISTORY_SELECT_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),

      this.orderModel.countDocuments(filter),
    ]);

    return {
      meta: {
        current,
        pageSize,
        pages: Math.ceil(total / pageSize),
        total,
      },
      result,
    };
  }

  async findOne(id: string, user: IUser) {
    const order = await this.orderModel
      .findById(id)
      .select(HISTORY_SELECT_FIELDS)
      .lean();

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    this.checkOrderOwner(order, user._id);

    return order;
  }

  private getPagination(query: QueryHistoryDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (current - 1) * pageSize;

    return {
      current,
      pageSize,
      skip,
    };
  }

  private buildFilter(query: QueryHistoryDto, userId: string) {
    const filter: FilterQuery<OrderDocument> = {
      userId,
    };

    this.applyStatusFilter(filter, query.status);
    this.applyOrderCodeFilter(filter, query.orderCode);
    this.applyDateFilter(filter, query.from, query.to);

    return filter;
  }

  private applyStatusFilter(
    filter: FilterQuery<OrderDocument>,
    status?: string,
  ) {
    if (!status) return;

    filter.status = status;
  }

  private applyOrderCodeFilter(
    filter: FilterQuery<OrderDocument>,
    orderCode?: string,
  ) {
    if (!orderCode?.trim()) return;

    filter.orderCode = {
      $regex: orderCode.trim(),
      $options: 'i',
    };
  }

  private applyDateFilter(
    filter: FilterQuery<OrderDocument>,
    from?: string,
    to?: string,
  ) {
    if (!from && !to) return;

    const dateFilter: {
      $gte?: Date;
      $lte?: Date;
    } = {};

    if (from) {
      dateFilter.$gte = new Date(from);
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);

      dateFilter.$lte = endDate;
    }

    filter.createdAt = dateFilter;
  }

  private checkOrderOwner(order: OrderDocument, userId: string) {
    if (order.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }
  }
}
