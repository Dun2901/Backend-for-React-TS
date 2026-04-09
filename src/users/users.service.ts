import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  RegisterUserDto,
  VerifyCodeDto,
} from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import type { SoftDeleteModel } from 'mongoose-delete';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { MailService } from '@/mail/mail.service';
import { IUser } from './users.interface';
import aqp from 'api-query-params';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    private mailService: MailService,
  ) {}

  getHashPassword = (password: string) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    return hash;
  };

  isValidPassword = (password: string, hash: string) => {
    return bcrypt.compareSync(password, hash);
  };

  async create(createUserDto: CreateUserDto, user: IUser) {
    // Check email exist
    const isExist = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (isExist) {
      throw new BadRequestException(
        'Email đã tồn tại, vui lòng sử dụng email khác',
      );
    }

    const hashPassword = this.getHashPassword(createUserDto.password);

    const newUser = await this.userModel.create({
      ...createUserDto,
      isActive: true,
      password: hashPassword,
      createdBy: {
        _id: user._id as any,
        email: user.email,
      },
    });

    return {
      _id: newUser._id,
      createdAt: newUser.createdAt,
    };
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population, projection } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.userModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .select('-password')
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Not a valid ObjectId!');
    }

    return await this.userModel.findById(id).select('-password'); // "-" is remove field
  }

  async findOneByUsername(username: string) {
    return await this.userModel.findOne({
      email: username,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, user: IUser) {
    return await this.userModel.updateOne(
      { _id: id },
      {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
  }

  async remove(id: string, deletedBy?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Not a valid ObjectId!');
    }

    return await this.userModel.delete({ _id: id }, deletedBy);
  }

  async register(registerUserDto: RegisterUserDto) {
    const { fullName, email, password, phone } = registerUserDto;

    // Check email exist
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(
        'Email đã tồn tại, vui lòng sử dụng email khác',
      );
    }

    // Hash password
    const hashPassword = this.getHashPassword(password);
    const newRegister = await this.userModel.create({
      fullName,
      email,
      password: hashPassword,
      phone,
      isActive: false,
      codeId: uuidv4(),
      codeExpired: dayjs().add(5, 'minutes').toDate(),
    });

    // Send email
    this.mailService
      .sendVerificationEmail({
        email: newRegister.email,
        fullName: newRegister.fullName,
        codeId: newRegister.codeId,
      })
      .catch((err) => console.error('Gửi mail không thành công:', err));

    // Trả ra phản hồi
    return {
      _id: newRegister._id,
      createdAt: newRegister.createdAt,
    };
  }

  updateUserToken = async (refreshToken: string, _id: string) => {
    return await this.userModel.updateOne(
      { _id },
      {
        refreshToken,
      },
    );
  };

  findUserByToken = async (refreshToken: string) => {
    return await this.userModel
      .findOne({
        refreshToken,
      })
      .select('-password');
  };

  async activateAccount(verifyCodeDto: VerifyCodeDto) {
    const { _id, codeId } = verifyCodeDto;

    const user = await this.userModel.findOne({ _id });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }
    // Đã active rồi
    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được xác thực trước đó');
    }
    // Kiểm tra code có đúng không
    if (user.codeId !== codeId) {
      throw new BadRequestException('Mã xác thực không hợp lệ');
    }

    // check code expire
    const isExpired = dayjs().isAfter(user.codeExpired);
    if (isExpired) {
      throw new BadRequestException(
        'Mã xác thực đã hết hạn, vui lòng yêu cầu mã mới',
      );
    }

    // Valid => update user
    await this.userModel.updateOne(
      { _id },
      {
        isActive: true,
      },
    );

    return { isExpired };
  }

  async resendVerifyCode(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }
    // Đã active rồi
    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được xác thực trước đó');
    }

    // Tạo code mới
    const newCode = uuidv4();
    const newExpired = dayjs().add(5, 'minutes').toDate();

    await this.userModel.updateOne(
      { email },
      { codeId: newCode, codeExpired: newExpired },
    );

    // send email
    this.mailService
      .sendVerificationEmail({
        email: user.email,
        fullName: user.fullName,
        codeId: newCode,
      })
      .catch((err) => console.error('Resend mail failed:', err));

    return { _id: user._id };
  }
}
