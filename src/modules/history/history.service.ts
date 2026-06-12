import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { QueryHistoryDto } from './dto/query-history.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { getPaginationMeta, getPaginationParams } from '@/common/pagination/custom.meta';

const HISTORY_SELECT_FIELDS = '-deleted -__v -items.deleted -shippingAddress.deleted';

const HISTORY_ORDER_STATUSES = ['COMPLETED', 'CANCELLED'];

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: SoftDeleteModel<OrderDocument>,
  ) {}

  async findMyOrders(query: QueryHistoryDto, user: IUser) {
    const { current, pageSize, skip } = getPaginationParams({
      currentPage: query.current,
      limit: query.pageSize,
    });

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
      meta: getPaginationMeta({
        current,
        pageSize,
        total,
      }),
      result,
    };
  }

  async findOne(id: string, user: IUser) {
    const order = await this.orderModel.findById(id).select(HISTORY_SELECT_FIELDS).lean();

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    this.checkOrderOwner(order, user._id);

    return order;
  }

  private buildFilter(query: QueryHistoryDto, userId: string) {
    const filter: FilterQuery<OrderDocument> = {
      userId,
      status: {
        $in: HISTORY_ORDER_STATUSES,
      },
    };

    this.applyStatusFilter(filter, query.status);
    this.applyOrderCodeFilter(filter, query.orderCode);
    this.applyDateFilter(filter, query.from, query.to);

    return filter;
  }

  private applyStatusFilter(filter: FilterQuery<OrderDocument>, status?: string) {
    if (!status) return;

    if (!HISTORY_ORDER_STATUSES.includes(status)) {
      return;
    }

    filter.status = status;
  }

  private applyOrderCodeFilter(filter: FilterQuery<OrderDocument>, orderCode?: string) {
    if (!orderCode?.trim()) return;

    filter.orderCode = {
      $regex: orderCode.trim(),
      $options: 'i',
    };
  }

  private applyDateFilter(filter: FilterQuery<OrderDocument>, from?: string, to?: string) {
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
