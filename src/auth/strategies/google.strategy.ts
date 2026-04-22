import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { IGoogleUser } from '../google-user.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_REDIRECT_URL'),
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const googleUser: IGoogleUser = {
      fullName: profile.displayName,
      email: profile.emails?.[0]?.value ?? '',
      avatar: profile.photos?.[0]?.value ?? 'default-google.png',
    };

    const user = await this.authService.validateUserGoogle(googleUser);

    done(null, user);
  }
}
