import { IS_PUBLIC_KEY } from '@/common/decorators/customize';
import {
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenExpiredError } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // lấy ra metadata để ko check Guard
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    // Nếu ko dùng thì để Nestjs làm
    return super.canActivate(context);
  }

  handleRequest<TUser = IUser>(err: Error, user: TUser, info: Error) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      // Token hết hạn → 419
      if (info instanceof TokenExpiredError) {
        throw new HttpException('Token hết hạn', 419);
      }
      // Các lỗi khác → 401
      throw (
        err ||
        new UnauthorizedException(
          'Token không hợp lệ/Không có Bearer Token ở Header request!',
        )
      );
    }
    return user;
  }
}
