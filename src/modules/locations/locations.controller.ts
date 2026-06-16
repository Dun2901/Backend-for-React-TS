import { Controller, Get, Param } from '@nestjs/common';
import { Public, ResponseMessage } from '@/common/decorators/customize';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Public()
  @Get('provinces')
  @ResponseMessage('Lấy danh sách tỉnh/thành phố thành công')
  findAllProvinces() {
    return this.locationsService.findAllProvinces();
  }

  @Public()
  @Get('provinces/:provinceCode/wards')
  @ResponseMessage('Lấy danh sách phường/xã/đặc khu thành công')
  findWardsByProvinceCode(@Param('provinceCode') provinceCode: string) {
    return this.locationsService.findWardsByProvinceCode(provinceCode);
  }
}
