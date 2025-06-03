import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(request: any, accessToken: string, refreshToken: string, profile: any) {
    try {
      const { emails, displayName } = profile;
      if (!emails || !emails.length) {
        throw new UnauthorizedException('Brak dostępu do adresu email.');
      }
      const email = emails[0].value;
      if (!email) {
        throw new UnauthorizedException('Nie udało się uzyskać adresu email.');
      }

      console.log('Google profile:', { email, displayName });
      const user = await this.authService.validateGoogleUser({ email, displayName });
      console.log('Validated user:', user);

      if (!user) {
        throw new UnauthorizedException('Nie udało się utworzyć lub znaleźć użytkownika.');
      }
      return user;
    } catch (error) {
      console.error('Google auth error:', error);
      throw new UnauthorizedException('Błąd podczas uwierzytelniania przez Google.');
    }
  }
}