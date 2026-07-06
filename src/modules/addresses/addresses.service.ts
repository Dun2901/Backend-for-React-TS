import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { Address, AddressDocument } from './schemas/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { LocationsService } from '@/modules/locations/locations.service';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name)
    private readonly addressModel: SoftDeleteModel<AddressDocument>,

    private readonly locationsService: LocationsService,
  ) {}

  private validateObjectId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Mã địa chỉ không hợp lệ');
    }
  }

  private normalizeText(value?: string | null) {
    return String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private toObjectId(id: string) {
    return new mongoose.Types.ObjectId(id);
  }

  private buildFullAddress(addressLine: string, wardName: string, provinceName: string) {
    return [addressLine, wardName, provinceName]
      .map((part) => this.normalizeText(part))
      .filter(Boolean)
      .join(', ');
  }

  async findMine(user: IUser) {
    return this.addressModel
      .find({ userId: user._id })
      .sort({ isDefault: -1, updatedAt: -1, createdAt: -1 })
      .select('-deleted')
      .exec();
  }

  async create(user: IUser, createAddressDto: CreateAddressDto) {
    const totalAddress = await this.addressModel.countDocuments({
      userId: user._id,
    });

    const shouldBeDefault = totalAddress === 0 || createAddressDto.isDefault === true;

    if (shouldBeDefault) {
      await this.addressModel.updateMany({ userId: user._id }, { $set: { isDefault: false } });
    }

    const { province, ward } = this.locationsService.validateProvinceAndWard(
      createAddressDto.provinceCode,
      createAddressDto.wardCode,
    );

    const addressLine = this.normalizeText(createAddressDto.addressLine);
    const wardName = this.normalizeText(ward.name);
    const provinceName = this.normalizeText(province.name);

    const createdAddress = await this.addressModel.create({
      userId: this.toObjectId(user._id),

      fullName: this.normalizeText(createAddressDto.fullName),
      phone: this.normalizeText(createAddressDto.phone),

      provinceCode: province.province_code,
      provinceName,

      wardCode: ward.ward_code,
      wardName,

      addressLine,
      fullAddress: this.buildFullAddress(addressLine, wardName, provinceName),

      isDefault: shouldBeDefault,

      createdBy: {
        _id: this.toObjectId(user._id),
        email: user.email,
      },
    });

    return createdAddress;
  }

  async update(user: IUser, id: string, updateAddressDto: UpdateAddressDto) {
    this.validateObjectId(id);

    const address = await this.addressModel.findOne({
      _id: id,
      userId: user._id,
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ giao hàng');
    }

    const nextFullName =
      updateAddressDto.fullName !== undefined
        ? this.normalizeText(updateAddressDto.fullName)
        : address.fullName;

    const nextPhone =
      updateAddressDto.phone !== undefined
        ? this.normalizeText(updateAddressDto.phone)
        : address.phone;

    const nextProvinceCode =
      updateAddressDto.provinceCode !== undefined
        ? this.normalizeText(updateAddressDto.provinceCode)
        : address.provinceCode;

    const nextWardCode =
      updateAddressDto.wardCode !== undefined
        ? this.normalizeText(updateAddressDto.wardCode)
        : address.wardCode;

    const nextAddressLine =
      updateAddressDto.addressLine !== undefined
        ? this.normalizeText(updateAddressDto.addressLine)
        : address.addressLine;

    const { province, ward } = this.locationsService.validateProvinceAndWard(
      nextProvinceCode,
      nextWardCode,
    );

    const nextProvinceName = this.normalizeText(province.name);
    const nextWardName = this.normalizeText(ward.name);

    if (updateAddressDto.isDefault === true) {
      await this.addressModel.updateMany(
        {
          userId: user._id,
          _id: { $ne: id },
        },
        {
          $set: { isDefault: false },
        },
      );
    }

    const updatedAddress = await this.addressModel
      .findOneAndUpdate(
        {
          _id: id,
          userId: user._id,
        },
        {
          $set: {
            fullName: nextFullName,
            phone: nextPhone,

            provinceCode: province.province_code,
            provinceName: nextProvinceName,

            wardCode: ward.ward_code,
            wardName: nextWardName,

            addressLine: nextAddressLine,
            fullAddress: this.buildFullAddress(nextAddressLine, nextWardName, nextProvinceName),

            ...(updateAddressDto.isDefault !== undefined && {
              isDefault: updateAddressDto.isDefault,
            }),

            updatedBy: {
              _id: this.toObjectId(user._id),
              email: user.email,
            },
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .select('-deleted');

    return updatedAddress;
  }

  async remove(user: IUser, id: string) {
    this.validateObjectId(id);

    const address = await this.addressModel.findOne({
      _id: id,
      userId: user._id,
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ giao hàng');
    }

    const wasDefault = address.isDefault;

    await this.addressModel.delete(
      {
        _id: id,
        userId: user._id,
      },
      user._id,
    );

    if (wasDefault) {
      const newestAddress = await this.addressModel
        .findOne({
          userId: user._id,
        })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        });

      if (newestAddress) {
        newestAddress.isDefault = true;
        newestAddress.updatedBy = {
          _id: this.toObjectId(user._id),
          email: user.email,
        };

        await newestAddress.save();
      }
    }

    return {
      deleted: true,
      _id: id,
    };
  }

  async setDefault(user: IUser, id: string) {
    this.validateObjectId(id);

    const address = await this.addressModel.findOne({
      _id: id,
      userId: user._id,
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ giao hàng');
    }

    await this.addressModel.updateMany(
      {
        userId: user._id,
      },
      {
        $set: { isDefault: false },
      },
    );

    return this.addressModel
      .findOneAndUpdate(
        {
          _id: id,
          userId: user._id,
        },
        {
          $set: {
            isDefault: true,
            updatedBy: {
              _id: this.toObjectId(user._id),
              email: user.email,
            },
          },
        },
        {
          returnDocument: 'after',
        },
      )
      .select('-deleted');
  }
}
