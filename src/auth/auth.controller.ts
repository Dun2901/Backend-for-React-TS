import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Public, ResponseMessage, User } from '@/decorator/customize';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterUserDto, VerifyCodeDto } from '@/users/dto/create-user.dto';
import type { Request, Response } from 'express';
import type { IUser } from '@/users/users.interface';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@/users/dto/password-user.dto';
import { GoogleOauthGuard } from './guards/google-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  @ResponseMessage('User login')
  handleLogin(@Req() req, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(req.user, response);
  }

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
  async googleCallBack(@Req() req) {}

  @Get('/account')
  @ResponseMessage('Get user information')
  handleGetAccount(@User() user: IUser) {
    return { user };
  }

  @Public()
  @Get('/refresh')
  @ResponseMessage('Get user refresh token')
  handleRefreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refresh_token'] as string;

    return this.authService.processNewToken(refreshToken, response);
  }

  @Post('/logout')
  @ResponseMessage('Logout User')
  handleLogout(
    @User() user: IUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(user, response);
  }

  @Public()
  @Post('/verify-code')
  @ResponseMessage('Verify code')
  verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto);
  }

  @Public()
  @Post('/resend-code')
  @ResponseMessage('Resend verify code')
  resendVerifyCode(@Body('email') email: string) {
    return this.authService.resendVerifyCode(email);
  }

  @Patch('/change-password')
  @ResponseMessage('Change password')
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @User() user: IUser,
  ) {
    return this.authService.changePassword(changePasswordDto, user);
  }

  @Public()
  @Post('/forgot-password')
  @ResponseMessage('Send reset password email')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('/reset-password')
  @ResponseMessage('Reset password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
