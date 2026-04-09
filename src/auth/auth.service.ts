import { RegisterUserDto, VerifyCodeDto } from '@/users/dto/create-user.dto';
import { IUser } from '@/users/users.interface';
import { UsersService } from '@/users/users.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Response } from 'express';
import ms from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Username, pass là 2 tham số thư viện passport ném về
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUsername(username);
    if (user) {
      const isValid = this.usersService.isValidPassword(pass, user?.password);
      if (isValid === true) {
        return user;
      }
    }

    throw new BadRequestException('Thông tin đăng nhập không chính xác');
  }

  async login(user: IUser, response: Response) {
    const { _id, email, fullName, role } = user;
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
    } catch (error) {
      throw new BadRequestException(
        'Refresh token không hợp lệ. Vui lòng login.',
      );
    }
  };

  logout = async (user: IUser, response: Response) => {
    await this.usersService.updateUserToken('', user.email);
    response.clearCookie('refresh_token');
    return 'ok';
  };

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    return await this.usersService.activateAccount(verifyCodeDto);
  }

  async resendVerifyCode(email: string) {
    return await this.usersService.resendVerifyCode(email);
  }
}
