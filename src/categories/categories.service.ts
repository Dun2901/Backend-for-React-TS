import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { SoftDeleteModel } from 'mongoose-delete';
import { Category, CategoryDocument } from './schemas/category.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: SoftDeleteModel<CategoryDocument>,
    private configService: ConfigService,
  ) {}

  private generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  async create(createCategoryDto: CreateCategoryDto, user: IUser) {
    const slug = createCategoryDto.slug
      ? this.generateSlug(createCategoryDto.slug)
      : this.generateSlug(createCategoryDto.name);

    const existedActiveCategory = await this.categoryModel.findOne({
      slug,
    });
    if (existedActiveCategory) {
      throw new BadRequestException('Danh mục đã tồn tại');
    }

    const existedDeletedCategory = await this.categoryModel.findOneDeleted({
      slug,
    });
    if (existedDeletedCategory) {
      throw new BadRequestException(
        'Danh mục này đã bị xóa trước đó. Bạn có thể khôi phục thay vì tạo lại.',
      );
    }

    const newCategory = await this.categoryModel.create({
      ...createCategoryDto,
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

  async findAll() {
    return this.categoryModel.find().sort({
      name: 1,
    });
  }

  async findAllForAdmin(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.categoryModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.categoryModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
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

  async findOne(id: string) {
    const category = await this.categoryModel.findOne({
      _id: id,
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, user: IUser) {
    const dataUpdate = {
      ...updateCategoryDto,
      updatedBy: {
        _id: user._id,
        email: user.email,
      },
    };

    if (updateCategoryDto.name && !updateCategoryDto.slug) {
      dataUpdate.slug = this.generateSlug(updateCategoryDto.name);
    }

    if (updateCategoryDto.slug) {
      dataUpdate.slug = this.generateSlug(updateCategoryDto.slug);
    }

    if (dataUpdate.slug) {
      const existedCategory = await this.categoryModel.findOneDeleted({
        _id: { $ne: id },
        slug: dataUpdate.slug,
      });

      if (existedCategory) {
        throw new BadRequestException(
          'Slug danh mục đã tồn tại. Nếu danh mục đã bị xóa, vui lòng restore thay vì tạo/sửa trùng slug.',
        );
      }
    }

    return await this.categoryModel.updateOne({ _id: id }, dataUpdate);
  }

  async findDeleted() {
    return this.categoryModel.findDeleted().sort({
      deletedAt: -1,
    });
  }

  async restore(id: string, user: IUser) {
    const category = await this.categoryModel.findOneDeleted({
      _id: id,
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục đã xóa');
    }

    await this.categoryModel.restore({
      _id: id,
    });
    await this.categoryModel.findByIdAndUpdate(id, {
      updatedBy: {
        _id: user._id,
        email: user.email,
      },
    });
    return {
      message: 'Khôi phục danh mục thành công',
    };
  }

  async remove(id: string, deletedBy?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Not a valid ObjectId!');
    }
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return await this.categoryModel.delete({ _id: id }, deletedBy);
  }
}
