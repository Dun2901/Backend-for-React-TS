import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResponseMessage, Roles, User } from '@/decorator/customize';
import { Serialize } from '@/interceptors/serialize.interceptor';
import { UserRoles } from '@/enum';
import { UserResponseDto } from './dto/user-response.dto';
import { UserAdminResponseDto } from './dto/user-admin-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Create a user')
  create(@Body() createUserDto: CreateUserDto, @User() user: IUser) {
    return this.usersService.create(createUserDto, user);
  }

  @Get()
  @Roles(UserRoles.ADMIN)
  @Serialize(UserAdminResponseDto)
  @ResponseMessage('Fetch user with paginate')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.usersService.findAll(+currentPage, +limit, qs);
  }

  @Get(':id')
  @Serialize(UserResponseDto)
  @ResponseMessage('Fetch user by id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Update a user')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: IUser,
  ) {
    return this.usersService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @Roles(UserRoles.ADMIN)
  @ResponseMessage('Delete a User')
  remove(@Param('id') id: string, @User() user: IUser): Promise<any> {
    return this.usersService.remove(id, user._id);
  }
}
