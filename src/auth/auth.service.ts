import { RegisterUserDto, VerifyCodeDto } from '@/users/dto/create-user.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@/users/dto/password-user.dto';
import { UsersService } from '@/users/users.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Response } from 'express';
import ms from 'ms';
import { authTypeEnum } from '@/enum';
import { User } from '@/users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private configService: ConfigService<IConfigService>,
  ) {}

  // Username, pass là 2 tham số thư viện passport ném về
  async validateUserLocal(
    email: string,
    pass: string,
  ): Promise<Partial<User> | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Thông tin đăng nhập không chính xác');
    }
    if (user?.accountType !== authTypeEnum.LOCAL) {
      throw new BadRequestException(
        `${email} address has registered via ${user?.accountType}!`,
      );
    }

    const isValid = await this.usersService.isValidPassword(
      pass,
      user.password,
    );
    if (!isValid) {
      throw new BadRequestException('Thông tin đăng nhập không chính xác');
    }
    return user;
  }

  async validateUserGoogle(
    googleUser: IGoogleUser,
  ): Promise<Partial<User> | null> {
    const user = await this.usersService.findByEmail(googleUser.email);
    if (user) {
      // Nếu user đã đăng ký LOCAL → không cho login Google
      if (user.accountType !== authTypeEnum.GOOGLE) {
        throw new BadRequestException(
          `${googleUser.email} address has registered via ${user.accountType}!`,
        );
      }
      return user;
    }
    const newUser = await this.usersService.createUserWithGoogle(googleUser);
    return newUser;
  }

  async login(user: IUser, response: Response) {
    const { _id, email, fullName, role, phone, avatar } = user;
    const payload = {
      sub: 'token login',
      iss: 'from server',
      _id,
      fullName,
      email,
      role,
    };

    const refresh_token = this.createRefreshToken(payload);

    // Update user with refresh_token
    await this.usersService.updateUserToken(refresh_token, _id);

    // Set refresh_token as cookies
    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      maxAge: ms(
        this.configService.get<string>('JWT_REFRESH_EXPIRE') as ms.StringValue,
      ),
    });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id,
        fullName,
        email,
        role,
        phone,
        avatar,
      },
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    return await this.usersService.register(registerUserDto);
  }

  createRefreshToken = (payload: any) => {
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRE'),
    } as JwtSignOptions);
    return refresh_token;
  };

  processNewToken = async (refreshToken: string, response: Response) => {
    try {
      this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findUserByToken(refreshToken);
      if (user) {
        const { _id, email, fullName, role } = user;
        const payload = {
          sub: 'token refresh',
          iss: 'from server',
          _id,
          fullName,
          email,
          role,
        };

        const refresh_token = this.createRefreshToken(payload);

        // Update user with refresh_token
        await this.usersService.updateUserToken(refresh_token, _id.toString());

        // Set refresh_token as cookies
        response.clearCookie('refresh_token');
        response.cookie('refresh_token', refresh_token, {
          httpOnly: true,
          maxAge: ms(
            this.configService.get<string>(
              'JWT_REFRESH_EXPIRE',
            ) as ms.StringValue,
          ),
        });

        return {
          access_token: this.jwtService.sign(payload),
          user: {
            _id,
            fullName,
            email,
            role,
          },
        };
      } else {
        throw new BadRequestException(
          'Không tồn tại refresh_token ở database. Please do login again.',
        );
      }
    } catch {
      throw new BadRequestException(
        'Refresh token không hợp lệ. Vui lòng login.',
      );
    }
  };

  logout = async (user: IUser, response: Response) => {
    await this.usersService.updateUserToken('', user._id);
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
