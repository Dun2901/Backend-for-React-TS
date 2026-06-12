import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import aqp from 'api-query-params';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';
import { getPaginationMeta, getPaginationParams } from '@/common/pagination/custom.meta';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: SoftDeleteModel<CategoryDocument>,
  ) {}

  /**
   * Kiểm tra ID có đúng định dạng MongoDB ObjectId hay không.
   */
  private validateObjectId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID danh mục không hợp lệ');
    }
  }

  /**
   * Chuyển tên category thành slug.
   *
   * Ví dụ:
   * "Sách Công Nghệ" => "sach-cong-nghe"
   */
  private generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Kiểm tra slug có đang được sử dụng bởi category khác không.
   *
   * Kiểm tra cả:
   * - Category đang hoạt động.
   * - Category đã bị soft delete.
   */
  private async validateUniqueSlug(slug: string, excludeId?: string) {
    const activeFilter: Record<string, unknown> = {
      slug,
    };

    const deletedFilter: Record<string, unknown> = {
      slug,
    };

    if (excludeId) {
      activeFilter._id = {
        $ne: excludeId,
      };

      deletedFilter._id = {
        $ne: excludeId,
      };
    }

    const existedActiveCategory = await this.categoryModel.findOne(activeFilter);

    if (existedActiveCategory) {
      throw new BadRequestException('Đã tồn tại danh mục đang hoạt động sử dụng slug này');
    }

    const existedDeletedCategory = await this.categoryModel.findOneDeleted(deletedFilter);

    if (existedDeletedCategory) {
      throw new BadRequestException(
        'Danh mục này đã bị xóa trước đó. Vui lòng khôi phục thay vì tạo hoặc sửa trùng slug.',
      );
    }
  }

  /**
   * Tạo category mới.
   */
  async create(createCategoryDto: CreateCategoryDto, user: IUser) {
    const slug = this.generateSlug(createCategoryDto.slug || createCategoryDto.name);

    if (!slug) {
      throw new BadRequestException('Không thể tạo slug từ tên danh mục');
    }

    await this.validateUniqueSlug(slug);

    const newCategory = await this.categoryModel.create({
      ...createCategoryDto,
      name: createCategoryDto.name.trim(),
      description: createCategoryDto.description?.trim() || '',
      slug,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      _id: newCategory._id,
      createdAt: newCategory.createdAt,
    };
  }

  /**
   * Lấy danh sách category đang hoạt động cho phía client.
   */
  async findAll() {
    return this.categoryModel
      .find()
      .sort({
        name: 1,
      })
      .exec();
  }

  /**
   * Lấy danh sách category đang hoạt động có phân trang cho admin.
   */
  async findAllForAdmin(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);

    delete filter.current;
    delete filter.pageSize;

    const { current, pageSize, skip } = getPaginationParams({
      currentPage,
      limit,
    });

    const totalItems = await this.categoryModel.countDocuments(filter);

    let query = this.categoryModel
      .find(filter)
      .skip(skip)
      .limit(pageSize)
      .sort(sort as Record<string, 1 | -1>);

    if (population) {
      query = query.populate(population);
    }

    const result = await query.exec();

    return {
      meta: getPaginationMeta({
        current,
        pageSize,
        total: totalItems,
      }),
      result,
    };
  }

  /**
   * Lấy chi tiết một category đang hoạt động.
   */
  async findOne(id: string) {
    this.validateObjectId(id);

    const category = await this.categoryModel.findById(id).exec();

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return category;
  }

  /**
   * Cập nhật category đang hoạt động.
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto, user: IUser) {
    this.validateObjectId(id);

    const category = await this.categoryModel.findById(id).exec();

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    let slug: string | undefined;

    if (updateCategoryDto.slug) {
      slug = this.generateSlug(updateCategoryDto.slug);
    } else if (updateCategoryDto.name) {
      slug = this.generateSlug(updateCategoryDto.name);
    }

    if (slug) {
      await this.validateUniqueSlug(slug, id);
    }

    const dataUpdate = {
      ...updateCategoryDto,

      ...(updateCategoryDto.name && {
        name: updateCategoryDto.name.trim(),
      }),

      ...(updateCategoryDto.description !== undefined && {
        description: updateCategoryDto.description.trim(),
      }),

      ...(slug && {
        slug,
      }),

      updatedBy: {
        _id: user._id,
        email: user.email,
      },
    };

    await this.categoryModel.updateOne(
      {
        _id: id,
      },
      {
        $set: dataUpdate,
      },
    );

    return {
      message: 'Cập nhật danh mục thành công',
    };
  }

  /**
   * Lấy danh sách category đã bị soft delete.
   */
  async findDeleted() {
    return this.categoryModel
      .findDeleted()
      .sort({
        deletedAt: -1,
      })
      .exec();
  }

  /**
   * Khôi phục category đã bị soft delete.
   */
  async restore(id: string, user: IUser) {
    this.validateObjectId(id);

    const category = await this.categoryModel
      .findOneDeleted({
        _id: id,
      })
      .exec();

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục đã xóa');
    }

    const existedActiveCategory = await this.categoryModel
      .findOne({
        slug: category.slug,
      })
      .exec();

    if (existedActiveCategory) {
      throw new BadRequestException(
        'Không thể khôi phục vì đã có danh mục đang hoạt động sử dụng slug này',
      );
    }

    await this.categoryModel.restore({
      _id: id,
    });

    await this.categoryModel.findByIdAndUpdate(id, {
      $set: {
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    });

    return {
      message: 'Khôi phục danh mục thành công',
    };
  }

  /**
   * Soft delete category.
   *
   * Category vẫn còn trong database và có thể được khôi phục.
   */
  async remove(id: string, deletedBy?: string) {
    this.validateObjectId(id);

    const category = await this.categoryModel.findById(id).exec();

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    await this.categoryModel.delete(
      {
        _id: id,
      },
      deletedBy,
    );

    return {
      message: 'Xóa danh mục thành công',
    };
  }
}
