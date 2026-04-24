import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Giải mã token
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Lấy từ header ra
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!, // Dựa vào key để decode
    });
  }

  validate(payload: IUser) {
    const { _id, fullName, email, role } = payload;
    // Giải mã xong gán vào req.user
    return {
      _id,
      fullName,
      email,
      role,
    };
  }
}
