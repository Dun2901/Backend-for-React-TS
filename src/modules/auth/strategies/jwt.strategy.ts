import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@/modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Giải mã token
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Lấy từ header ra
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!, // Dựa vào key để decode
    });
  }

  async validate(payload: IJwtPayload) {
    const user = await this.usersService.findById(payload._id);
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    const currentTokenVersion = user.tokenVersion ?? 0;
    const payloadTokenVersion = payload.tokenVersion ?? 0;

    if (currentTokenVersion !== payloadTokenVersion) {
      throw new UnauthorizedException('Token đã bị vô hiệu hóa. Vui lòng đăng nhập lại.');
    }

    const { _id, fullName, email, role, avatar } = payload;
    // Giải mã xong gán vào req.user
    return {
      _id,
      fullName,
      email,
      role,
      avatar,
    };
  }
}
