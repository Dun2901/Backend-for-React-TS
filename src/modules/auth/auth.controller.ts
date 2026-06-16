import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Public, ResponseMessage, User } from '@/common/decorators/customize';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterUserDto, VerifyCodeDto } from '@/modules/users/dto/create-user.dto';
import type { Request, Response } from 'express';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@/modules/users/dto/password-user.dto';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { Serialize } from '@/common/interceptors/serialize.interceptor';
import { AccountResponseDto } from './dto/account-response.dto';
import { buildClientRedirectUrl } from '@/common/utils/app-url.util';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService<IConfigService>,
    private authService: AuthService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  @ResponseMessage('User login')
  handleLogin(@User() user: IUser, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(user, response);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('/register')
  @ResponseMessage('Register a new user')
  handleRegister(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @Public()
  @Get('/google')
  @UseGuards(GoogleOauthGuard)
  async googleLogin() {}

  @Public()
  @Get('/google/redirect')
  @UseGuards(GoogleOauthGuard)
  async googleCallBack(@User() user: IUser, @Res() res: Response) {
    const { access_token } = await this.authService.login(user, res);

    const redirectUrl = buildClientRedirectUrl(this.configService, '/', {
      token: access_token,
    });

    return res.redirect(redirectUrl);
  }

  @Get('account')
  @Serialize(AccountResponseDto)
  @ResponseMessage('Get user account')
  getAccount(@User() user: IUser) {
    return this.authService.getAccount(user);
  }

  @Public()
  @Get('/refresh')
  @ResponseMessage('Get user refresh token')
  handleRefreshToken(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies['refresh_token'] as string;

    return this.authService.processNewToken(refreshToken, response);
  }

  @Public()
  @Post('/logout')
  @ResponseMessage('Logout User')
  handleLogout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies['refresh_token'] as string;

    return this.authService.logout(refreshToken, response);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('/verify-code')
  @ResponseMessage('Verify code')
  verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('/resend-code')
  @ResponseMessage('Resend verify code')
  resendVerifyCode(@Body('email') email: string) {
    return this.authService.resendVerifyCode(email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('/change-password')
  @ResponseMessage('Change password')
  changePassword(@Body() changePasswordDto: ChangePasswordDto, @User() user: IUser) {
    return this.authService.changePassword(changePasswordDto, user);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('/forgot-password')
  @ResponseMessage('Send reset password email')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('/reset-password')
  @ResponseMessage('Reset password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
