import { RegisterUserDto, VerifyCodeDto } from '@/modules/users/dto/create-user.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@/modules/users/dto/password-user.dto';
import { UsersService } from '@/modules/users/users.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Response } from 'express';
import ms from 'ms';
import { authTypeEnum } from '@/common/enums';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import { compareToken, hashToken } from '@/common/helpers/token.helper';
import { Types } from 'mongoose';

type TokenUser = {
  _id: string | Types.ObjectId;
  email: string;
  fullName: string;
  role: string;
  avatar?: string;
  tokenVersion?: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private configService: ConfigService<IConfigService>,
  ) {}

  // Username, pass là 2 tham số thư viện passport ném về
  async validateUserLocal(email: string, pass: string): Promise<Partial<User> | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Thông tin đăng nhập không chính xác');
    }
    if (user?.accountType !== authTypeEnum.LOCAL) {
      throw new BadRequestException(`${email} address has registered via ${user?.accountType}!`);
    }

    const isValid = await this.usersService.isValidPassword(pass, user.password);
    if (!isValid) {
      throw new BadRequestException('Thông tin đăng nhập không chính xác');
    }
    return user;
  }

  async validateUserGoogle(googleUser: IGoogleUser): Promise<UserDocument> {
    const user = await this.usersService.findByEmail(googleUser.email);
    if (user) {
      if (user.accountType !== authTypeEnum.GOOGLE) {
        throw new BadRequestException(
          `${googleUser.email} address has registered via ${user.accountType}!`,
        );
      }

      // Sync avatar mới nhất từ Google
      const freshAvatar = googleUser.avatar !== 'default-google.png' ? googleUser.avatar : null;
      if (freshAvatar && user.avatar !== freshAvatar) {
        user.avatar = freshAvatar;
        await user.save();
      }

      return user;
    }
    return await this.usersService.createUserWithGoogle(googleUser);
  }

  async login(user: IUser, response: Response) {
    const { _id, email, fullName, role, phone, avatar } = user;
    const { accessToken, refreshToken } = await this.generateTokens(user);
    const refreshTokenHash = await hashToken(refreshToken);

    // Lưu hash refresh token vào database
    await this.usersService.updateUserToken(refreshTokenHash, _id);

    // Set refresh_token as cookies
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE') as ms.StringValue),
    });

    return {
      access_token: accessToken,
      user: {
        _id,
        email,
        fullName,
        role,
        phone,
        avatar,
      },
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    return await this.usersService.register(registerUserDto);
  }

  async getAccount(user: IUser) {
    const currentUser = await this.usersService.getAccount(user._id);

    return {
      user: currentUser,
    };
  }

  createRefreshToken = (payload: any) => {
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRE'),
    } as JwtSignOptions);
    return refresh_token;
  };

  async generateTokens(user: TokenUser) {
    const { _id, email, fullName, role, avatar, tokenVersion } = user;
    const payload = {
      sub: 'token',
      iss: 'from server',
      _id,
      fullName,
      email,
      role,
      avatar: avatar ? avatar : 'default-user.png',
      tokenVersion: tokenVersion ?? 0,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRE'),
    } as JwtSignOptions);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRE'),
    } as JwtSignOptions);

    return {
      accessToken,
      refreshToken,
    };
  }

  processNewToken = async (refreshToken: string, response: Response) => {
    try {
      if (!refreshToken) {
        throw new BadRequestException('Không tìm thấy refresh token. Vui lòng login lại.');
      }

      const payload = this.jwtService.verify<IJwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findByEmail(payload.email);
      if (!user || !user.hashedRefreshToken) {
        throw new NotFoundException('Không tồn tại refresh_token ở database. Vui lòng login lại.');
      }

      const isMatch = await compareToken(refreshToken, user.hashedRefreshToken);
      if (!isMatch) {
        await this.usersService.updateUserToken(null, user._id.toString());
        response.clearCookie('refresh_token');
        throw new BadRequestException({
          code: 'REFRESH_TOKEN_REUSED',
          message: 'Refresh token đã bị dùng lại. Vui lòng login lại.',
        });
      }

      const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user);

      const newRefreshTokenHash = await hashToken(newRefreshToken);

      await this.usersService.updateUserToken(newRefreshTokenHash, user._id.toString());

      response.clearCookie('refresh_token');
      response.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE') as ms.StringValue),
      });

      return {
        access_token: accessToken,
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          avatar: user.avatar ? user.avatar : 'default-user.png',
        },
      };
    } catch (error) {
      response.clearCookie('refresh_token');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        code: 'REFRESH_TOKEN_INVALID',
        message: 'Refresh token không hợp lệ hoặc đã hết hạn. Vui lòng login.',
      });
    }
  };

  logout = async (refreshToken: string, response: Response) => {
    const payload = this.jwtService.decode<IJwtPayload>(refreshToken);

    if (payload?.email) {
      const user = await this.usersService.findByEmail(payload.email);

      if (user) {
        await this.usersService.updateUserToken(null, user._id.toString());
        await this.usersService.incrementTokenVersion(user._id.toString());
      }
    }
    response.clearCookie('refresh_token');
    return 'ok';
  };

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    return await this.usersService.activateAccount(verifyCodeDto);
  }

  async resendVerifyCode(email: string) {
    return await this.usersService.resendVerifyCode(email);
  }

  async changePassword(changePasswordDto: ChangePasswordDto, user: IUser) {
    return await this.usersService.changePassword(changePasswordDto, user);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    return await this.usersService.forgotPassword(forgotPasswordDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return await this.usersService.resetPassword(resetPasswordDto);
  }
}
