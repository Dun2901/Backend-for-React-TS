import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
import aqp from 'api-query-params';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password-user.dto';
import { authTypeEnum, UserRoles } from '@/enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    private mailService: MailService,
  ) {}

  async getHashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }

  async isValidPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

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
    const { password, ...rest } = createUserDto;
    const hashPassword = await this.getHashPassword(password);

    const newUser = await this.userModel.create({
      ...rest,
      isActive: true,
      password: hashPassword,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      _id: newUser._id,
      createdAt: newUser.createdAt,
    };
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);
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
      // .select([
      //   '-password',
      //   '-refreshToken',
      //   '-hashedRefreshToken',
      //   '-codeId',
      //   '-codeExpired',
      //   '-passwordResetToken',
      //   '-passwordResetExpired',
      //   '-passwordChangeAt',
      // ])  "-" is remove field;
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

    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return user;
  }

  async findByEmail(email: string) {
    if (!email) {
      throw new NotFoundException('user not found');
    }
    return await this.userModel.findOne({
      email,
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

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (
      user.email === 'admin@gmail.com' ||
      user.email === 'user@gmail.com' ||
      user.email === 'guest@gmail.com'
    ) {
      throw new BadRequestException(
        'Định mệnh, xóa tài khoản này lấy gì mà test @@',
      );
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
    const hashPassword = await this.getHashPassword(password);
    const newRegister = await this.userModel.create({
      fullName,
      email,
      password: hashPassword,
      phone,
      accountType: authTypeEnum.LOCAL,
      role: UserRoles.USER,
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

  updateUserToken = async (hashedRefreshToken: string | null, _id: string) => {
    return await this.userModel.findByIdAndUpdate(
      { _id },
      {
        hashedRefreshToken,
      },
    );
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
      throw new BadRequestException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn!',
      );
    }

    // check code expire
    const isExpired = dayjs().isAfter(user.codeExpired);
    if (isExpired) {
      throw new BadRequestException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn!',
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

  async changePassword(changePasswordDto: ChangePasswordDto, user: IUser) {
    const { oldPassword, newPassword } = changePasswordDto;

    // Find user
    const foundUser = await this.userModel.findById(user._id);
    if (!foundUser) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    // So sánh pass cũ với pass trong DB
    const passwordMatch = await bcrypt.compare(oldPassword, foundUser.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    // Update user password (hash password)
    const newHashedPassword = await this.getHashPassword(newPassword);
    await this.userModel.updateOne(
      { _id: user._id },
      { password: newHashedPassword, passwordChangeAt: new Date() },
    );
    return 'ok';
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    // Check mail
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('Tài khoản không hợp lệ');
    }

    // Tạo code mới
    const newCode = uuidv4();
    const newExpired = dayjs().add(5, 'minutes').toDate();

    // Update user
    await this.userModel.updateOne(
      { email },
      { passwordResetToken: newCode, passwordResetExpired: newExpired },
    );

    // send email
    this.mailService
      .sendResetPasswordEmail({
        email: user.email,
        fullName: user.fullName,
        codeId: newCode,
      })
      .catch((err) => console.error('Resend mail failed:', err));

    return { _id: user._id, email: user.email };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, newPassword, confirmPassword, codeId } = resetPasswordDto;

    // Check confirm password
    if (confirmPassword !== newPassword) {
      throw new BadRequestException(
        'Mật khẩu/Xác nhận mật khẩu không chính xác.',
      );
    }

    // Check mail
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Tài khoản không hợp lệ');
    }

    // Check code hợp lệ
    const isValidCode = user.passwordResetToken === codeId;

    // Check còn hạn
    const isNotExpired = dayjs().isBefore(user.passwordResetExpired);

    if (!isValidCode || !isNotExpired) {
      throw new BadRequestException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn!',
      );
    }

    // Update password
    const hashPassword = await this.getHashPassword(newPassword);
    await this.userModel.updateOne(
      { email },
      {
        password: hashPassword,
        passwordResetToken: null,
        passwordResetExpired: null,
        passwordChangeAt: new Date(),
      },
    );

    return { isNotExpired };
  }

  async createUserWithGoogle(googleUser: IGoogleUser) {
    // Check if user exists
    const userExists = await this.findByEmail(googleUser.email);
    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    // Create new User
    const user = await this.userModel.create({
      ...googleUser,
      password: '',
      role: UserRoles.USER,
      isActive: true,
      accountType: authTypeEnum.GOOGLE,
    });
    return user;
  }
}
