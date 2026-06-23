import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public, ResponseMessage, Roles, User } from '@/common/decorators/customize';
import { UserRoles } from '@/common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiBearerAuth('access-token')
  @Post()
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Create category')
  create(@Body() createCategoryDto: CreateCategoryDto, @User() user: IUser) {
    return this.categoriesService.create(createCategoryDto, user);
  }

  @Public()
  @UseInterceptors(CacheInterceptor)
  @Get()
  @ResponseMessage('Fetch categories')
  findAllForAdmin(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    // Nếu có paginate params → trả về dạng paginate (cho admin)
    if (currentPage && limit) {
      return this.categoriesService.findAllForAdmin(+currentPage, +limit, qs);
    }
    // Không có → trả về tất cả (cho FE)
    return this.categoriesService.findAll();
  }

  @ApiBearerAuth('access-token')
  @Get('deleted')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Fetch deleted categories')
  findDeleted() {
    return this.categoriesService.findDeleted();
  }

  @Public()
  @UseInterceptors(CacheInterceptor)
  @Get(':id')
  @ResponseMessage('Fetch category by id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @Patch(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Update a category')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @User() user: IUser,
  ) {
    return this.categoriesService.update(id, updateCategoryDto, user);
  }

  @ApiBearerAuth('access-token')
  @Patch(':id/restore')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Restore category')
  restore(@Param('id') id: string, @User() user: IUser) {
    return this.categoriesService.restore(id, user);
  }

  @ApiBearerAuth('access-token')
  @Delete(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Delete category')
  remove(@Param('id') id: string, @User() user: IUser): Promise<any> {
    return this.categoriesService.remove(id, user._id);
  }
}
