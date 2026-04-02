import { RegisterUserDto, VerifyCodeDto } from '@/users/dto/create-user.dto';
import { IUser } from '@/users/users.interface';
import { UsersService } from '@/users/users.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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

  async login(user: IUser) {
    const { _id, email, fullName, role } = user;
    const payload = {
      sub: 'token login',
      iss: 'from server',
      _id,
      fullName,
      email,
      role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      _id,
      fullName,
      email,
      role,
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    return await this.usersService.register(registerUserDto);
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    return await this.usersService.activateAccount(verifyCodeDto);
  }

  async resendVerifyCode(email: string) {
    return await this.usersService.resendVerifyCode(email);
  }
}
