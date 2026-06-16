import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ResponseMessage, User } from '@/common/decorators/customize';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get('me')
  @ResponseMessage('Lấy danh sách địa chỉ giao hàng thành công')
  findMine(@User() user: IUser) {
    return this.addressesService.findMine(user);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @ResponseMessage('Tạo địa chỉ giao hàng thành công')
  create(@User() user: IUser, @Body() createAddressDto: CreateAddressDto) {
    return this.addressesService.create(user, createAddressDto);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id')
  @ResponseMessage('Cập nhật địa chỉ giao hàng thành công')
  update(@User() user: IUser, @Param('id') id: string, @Body() updateAddressDto: UpdateAddressDto) {
    return this.addressesService.update(user, id, updateAddressDto);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id/default')
  @ResponseMessage('Đặt địa chỉ mặc định thành công')
  setDefault(@User() user: IUser, @Param('id') id: string) {
    return this.addressesService.setDefault(user, id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Delete(':id')
  @ResponseMessage('Xóa địa chỉ giao hàng thành công')
  remove(@User() user: IUser, @Param('id') id: string) {
    return this.addressesService.remove(user, id);
  }
}
