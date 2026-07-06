import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, SortOrder, Types } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { UserRoles } from '@/common/enums';
import { getPaginationMeta, getPaginationParams } from '@/common/pagination/custom.meta';
import { Book, BookDocument } from '@/modules/books/schemas/book.schema';
import { Order, OrderDocument, OrderStatus } from '@/modules/orders/schemas/order.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

type RatingSummary = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

type ReviewRatingStat = {
  _id: number;
  count: number;
};

type ReviewSortOption = Record<string, SortOrder>;

type BookReviewSummary = {
  averageRating?: number;
  reviewCount?: number;
  ratingSummary?: Partial<RatingSummary>;
};

type ReviewableOrder = {
  _id: Types.ObjectId;
};

type PendingOrderItem = {
  bookId: Types.ObjectId | string;
  bookName: string;
  thumbnail?: string;
};

type PendingReviewOrder = {
  _id: Types.ObjectId;
  orderCode: string;
  createdAt: Date;
  items: PendingOrderItem[];
};

type MongoDuplicateKeyError = {
  code: 11000;
};

const EMPTY_RATING_SUMMARY: RatingSummary = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

const isMongoDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
};

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: SoftDeleteModel<ReviewDocument>,

    @InjectModel(Book.name)
    private readonly bookModel: SoftDeleteModel<BookDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: SoftDeleteModel<OrderDocument>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private validateObjectId(id: string, message = 'ID không hợp lệ') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(message);
    }
  }

  private toObjectId(id: string | Types.ObjectId) {
    if (id instanceof Types.ObjectId) {
      return id;
    }

    return new Types.ObjectId(id);
  }

  private async assertBookExists(bookId: string) {
    this.validateObjectId(bookId, 'bookId không hợp lệ');

    const book = await this.bookModel.findById(bookId).select('_id mainText').exec();

    if (!book) {
      throw new NotFoundException('Sách không tồn tại hoặc đã bị xóa');
    }

    return book;
  }

  private getSortOption(sort?: QueryReviewDto['sort']): ReviewSortOption {
    switch (sort) {
      case 'oldest':
        return { createdAt: 1 };

      case 'rating_desc':
        return { rating: -1, createdAt: -1 };

      case 'rating_asc':
        return { rating: 1, createdAt: -1 };

      case 'newest':
      default:
        return { createdAt: -1 };
    }
  }

  async findMyReviewsByBook(bookId: string, user: IUser) {
    await this.assertBookExists(bookId);

    return this.reviewModel
      .find({
        bookId: this.toObjectId(bookId),
        userId: this.toObjectId(user._id),
      })
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: 'fullName email avatar' })
      .populate({ path: 'orderId', select: 'orderCode createdAt' })
      .select('-deleted -__v')
      .exec();
  }

  private async findReviewableOrder(userId: string, dto: CreateReviewDto) {
    const userObjectId = this.toObjectId(userId);
    const bookObjectId = this.toObjectId(dto.bookId);

    const baseFilter = {
      userId: userObjectId,
      status: OrderStatus.COMPLETED,
      'items.bookId': bookObjectId,
    };

    if (dto.orderId) {
      this.validateObjectId(dto.orderId, 'orderId không hợp lệ');

      const order = await this.orderModel
        .findOne({
          ...baseFilter,
          _id: this.toObjectId(dto.orderId),
        })
        .select('_id')
        .lean<ReviewableOrder>()
        .exec();

      if (!order) {
        throw new BadRequestException(
          'Bạn chỉ có thể đánh giá sách đã mua trong đơn hàng đã hoàn thành',
        );
      }

      const existedReview = await this.reviewModel
        .findOne({
          userId: userObjectId,
          bookId: bookObjectId,
          orderId: this.toObjectId(dto.orderId),
        })
        .select('_id')
        .lean()
        .exec();

      if (existedReview) {
        throw new BadRequestException('Bạn đã đánh giá sách này trong đơn hàng này rồi');
      }

      return order;
    }

    const completedOrders = await this.orderModel
      .find(baseFilter)
      .sort({ createdAt: -1 })
      .select('_id')
      .lean<ReviewableOrder[]>()
      .exec();

    for (const order of completedOrders) {
      const existedReview = await this.reviewModel
        .findOne({
          userId: userObjectId,
          bookId: bookObjectId,
          orderId: order._id,
        })
        .select('_id')
        .lean()
        .exec();

      if (!existedReview) {
        return order;
      }
    }

    if (completedOrders.length > 0) {
      throw new BadRequestException('Bạn đã đánh giá tất cả đơn hàng có sách này rồi');
    }

    throw new BadRequestException(
      'Bạn chỉ có thể đánh giá sách đã mua trong đơn hàng đã hoàn thành',
    );
  }

  private async recalculateBookRating(bookId: string) {
    const bookObjectId = this.toObjectId(bookId);

    const stats = await this.reviewModel
      .aggregate<ReviewRatingStat>([
        {
          $match: {
            bookId: bookObjectId,
            deleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const ratingSummary: RatingSummary = { ...EMPTY_RATING_SUMMARY };

    let totalRating = 0;
    let reviewCount = 0;

    for (const item of stats) {
      const rating = item._id;
      const count = item.count;

      if (rating >= 1 && rating <= 5) {
        const ratingKey = rating as keyof RatingSummary;

        ratingSummary[ratingKey] = count;
        totalRating += rating * count;
        reviewCount += count;
      }
    }

    const averageRating = reviewCount > 0 ? Number((totalRating / reviewCount).toFixed(1)) : 0;

    await this.bookModel
      .updateOne(
        { _id: bookObjectId },
        {
          $set: {
            averageRating,
            reviewCount,
            ratingSummary,
          },
        },
      )
      .exec();

    await this.cacheManager.clear();

    return {
      averageRating,
      reviewCount,
      ratingSummary,
    };
  }

  async create(dto: CreateReviewDto, user: IUser) {
    await this.assertBookExists(dto.bookId);

    const reviewableOrder = await this.findReviewableOrder(user._id, dto);

    try {
      const review = await this.reviewModel.create({
        userId: this.toObjectId(user._id),
        bookId: this.toObjectId(dto.bookId),
        orderId: reviewableOrder._id,
        rating: dto.rating,
        comment: dto.comment?.trim(),
        media: dto.media || [],
        createdBy: {
          _id: this.toObjectId(user._id),
          email: user.email,
        },
      });

      await this.recalculateBookRating(dto.bookId);

      return this.reviewModel
        .findById(review._id)
        .populate({ path: 'userId', select: 'fullName email avatar' })
        .populate({ path: 'orderId', select: 'orderCode createdAt' })
        .exec();
    } catch (error: unknown) {
      if (isMongoDuplicateKeyError(error)) {
        throw new BadRequestException('Bạn đã đánh giá sách này trong đơn hàng này rồi');
      }

      throw error;
    }
  }

  async findByBook(bookId: string, query: QueryReviewDto) {
    await this.assertBookExists(bookId);

    const { current, pageSize, skip } = getPaginationParams({
      currentPage: query.current || 1,
      limit: query.pageSize || 5,
    });

    const bookObjectId = this.toObjectId(bookId);

    const filter: FilterQuery<ReviewDocument> = {
      bookId: bookObjectId,
    };

    if (query.rating) {
      filter.rating = query.rating;
    }

    if (query.hasMedia) {
      filter['media.0'] = { $exists: true };
    }

    if (query.hasComment) {
      filter.comment = {
        $exists: true,
        $type: 'string',
        $regex: /\S/,
      };
    }

    const commentFilter: FilterQuery<ReviewDocument> = {
      bookId: bookObjectId,
      comment: {
        $exists: true,
        $type: 'string',
        $regex: /\S/,
      },
    };

    const mediaFilter: FilterQuery<ReviewDocument> = {
      bookId: bookObjectId,
      'media.0': { $exists: true },
    };

    const [result, total, summary, commentCount, mediaCount] = await Promise.all([
      this.reviewModel
        .find(filter)
        .skip(skip)
        .limit(pageSize)
        .sort(this.getSortOption(query.sort))
        .populate({ path: 'userId', select: 'fullName email avatar' })
        .populate({ path: 'orderId', select: 'orderCode createdAt' })
        .select('-deleted -__v')
        .exec(),

      this.reviewModel.countDocuments(filter).exec(),

      this.bookModel
        .findById(bookObjectId)
        .select('averageRating reviewCount ratingSummary')
        .lean<BookReviewSummary>()
        .exec(),

      this.reviewModel.countDocuments(commentFilter).exec(),

      this.reviewModel.countDocuments(mediaFilter).exec(),
    ]);

    return {
      meta: getPaginationMeta({
        current,
        pageSize,
        total,
      }),
      result,
      summary: {
        averageRating: summary?.averageRating ?? 0,
        reviewCount: summary?.reviewCount ?? 0,
        commentCount,
        mediaCount,
        ratingSummary: {
          ...EMPTY_RATING_SUMMARY,
          ...(summary?.ratingSummary ?? {}),
        },
      },
    };
  }

  async findMyPending(user: IUser) {
    const completedOrders = await this.orderModel
      .find({
        userId: this.toObjectId(user._id),
        status: OrderStatus.COMPLETED,
      })
      .sort({ createdAt: -1 })
      .select('_id orderCode items createdAt')
      .lean<PendingReviewOrder[]>()
      .exec();

    const pendingItems: {
      orderId: string;
      orderCode: string;
      bookId: string;
      bookName: string;
      thumbnail?: string;
      orderCreatedAt: Date;
    }[] = [];

    for (const order of completedOrders) {
      for (const item of order.items || []) {
        const existedReview = await this.reviewModel
          .findOne({
            userId: this.toObjectId(user._id),
            bookId: this.toObjectId(item.bookId),
            orderId: order._id,
          })
          .select('_id')
          .lean()
          .exec();

        if (!existedReview) {
          pendingItems.push({
            orderId: order._id.toString(),
            orderCode: order.orderCode,
            bookId: item.bookId.toString(),
            bookName: item.bookName,
            thumbnail: item.thumbnail,
            orderCreatedAt: order.createdAt,
          });
        }
      }
    }

    return pendingItems;
  }

  async update(id: string, dto: UpdateReviewDto, user: IUser) {
    this.validateObjectId(id, 'reviewId không hợp lệ');

    const review = await this.reviewModel.findById(id).exec();

    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }

    if (review.userId.toString() !== user._id) {
      throw new ForbiddenException('Bạn không có quyền sửa đánh giá này');
    }

    const updateData: Record<string, unknown> = {
      updatedBy: {
        _id: this.toObjectId(user._id),
        email: user.email,
      },
    };

    if (dto.rating !== undefined) {
      updateData.rating = dto.rating;
    }

    if (dto.comment !== undefined) {
      updateData.comment = dto.comment.trim();
    }

    if (dto.media !== undefined) {
      updateData.media = dto.media;
    }

    const updatedReview = await this.reviewModel
      .findOneAndUpdate(
        { _id: this.toObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after', runValidators: true },
      )
      .populate({ path: 'userId', select: 'fullName email avatar' })
      .populate({ path: 'orderId', select: 'orderCode createdAt' })
      .exec();

    await this.recalculateBookRating(review.bookId.toString());

    return updatedReview;
  }

  async remove(id: string, user: IUser) {
    this.validateObjectId(id, 'reviewId không hợp lệ');

    const review = await this.reviewModel.findById(id).exec();

    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }

    const isOwner = review.userId.toString() === user._id;
    const isAdmin = user.role === UserRoles.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');
    }

    await this.reviewModel.delete({ _id: this.toObjectId(id) }, user._id);
    await this.recalculateBookRating(review.bookId.toString());

    return {
      deleted: true,
      _id: id,
    };
  }

  async markHelpful(id: string, user: IUser) {
    this.validateObjectId(id, 'reviewId không hợp lệ');

    const review = await this.reviewModel.findById(id).exec();

    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }

    const userObjectId = this.toObjectId(user._id);
    const hasMarked = (review.helpfulBy || []).some((item) => item.toString() === user._id);

    const updatedReview = await this.reviewModel
      .findOneAndUpdate(
        { _id: this.toObjectId(id) },
        hasMarked
          ? { $pull: { helpfulBy: userObjectId } }
          : { $addToSet: { helpfulBy: userObjectId } },
        { returnDocument: 'after' },
      )
      .populate({ path: 'userId', select: 'fullName email avatar' })
      .populate({ path: 'orderId', select: 'orderCode createdAt' })
      .exec();

    return updatedReview;
  }
}
