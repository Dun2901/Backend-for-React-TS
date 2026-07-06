import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import vietnamAddresses from './data/vietnam-addresses';

export type VietnamWard = {
  ward_code: string;
  name: string;
  province_code: string;
};

export type VietnamProvince = {
  province_code: string;
  name: string;
  short_name: string;
  code: string;
  place_type: string;
  wards: VietnamWard[];
};

@Injectable()
export class LocationsService {
  private readonly provinces = vietnamAddresses as VietnamProvince[];

  private normalizeCode(code: string) {
    return String(code ?? '').trim();
  }

  findAllProvinces() {
    return this.provinces.map((province) => ({
      provinceCode: province.province_code,
      name: province.name,
      shortName: province.short_name,
      code: province.code,
      placeType: province.place_type,
    }));
  }

  findWardsByProvinceCode(provinceCode: string) {
    const normalizedProvinceCode = this.normalizeCode(provinceCode);

    const province = this.provinces.find((item) => item.province_code === normalizedProvinceCode);

    if (!province) {
      throw new NotFoundException('Không tìm thấy tỉnh/thành phố');
    }

    return province.wards.map((ward) => ({
      wardCode: ward.ward_code,
      name: ward.name,
      provinceCode: ward.province_code,
    }));
  }

  validateProvinceAndWard(provinceCode: string, wardCode: string) {
    const normalizedProvinceCode = this.normalizeCode(provinceCode);
    const normalizedWardCode = this.normalizeCode(wardCode);

    const province = this.provinces.find((item) => item.province_code === normalizedProvinceCode);

    if (!province) {
      throw new BadRequestException('Tỉnh/Thành phố không hợp lệ');
    }

    const ward = province.wards.find((item) => item.ward_code === normalizedWardCode);

    if (!ward) {
      throw new BadRequestException('Phường/Xã/Đặc khu không thuộc tỉnh/thành phố đã chọn');
    }

    return {
      province,
      ward,
    };
  }
}
