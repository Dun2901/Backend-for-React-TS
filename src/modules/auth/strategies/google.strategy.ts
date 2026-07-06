import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { getGoogleRedirectUrl } from '@/common/utils/app-url.util';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService<IConfigService>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_SECRET')!,
      callbackURL: getGoogleRedirectUrl(configService),
      scope: ['profile', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile): Promise<any> {
    const googleUser: IGoogleUser = {
      fullName: profile.displayName,
      email: profile.emails?.[0]?.value ?? '',
      avatar: profile.photos?.[0]?.value ?? 'default-google.png',
    };

    const user = await this.authService.validateUserGoogle(googleUser);

    return {
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar ?? googleUser.avatar,
      tokenVersion: user.tokenVersion ?? 0,
    };
  }
}
