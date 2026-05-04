import { Injectable, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { GoogleService } from 'src/providers/google/google.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { AuthTopics, UserTopics } from 'src/shared/constants/topic.constant';
import { CookieMaxAge } from 'src/shared/constants/auth.constant';
import {
  ForgotPasswordOTPDto,
  LoginDto,
  RegisterDto,
  RegisterOwnerDto,
  ResetPasswordDto,
  ResetPasswordOTPDto,
  ValidateOTPDto,
} from 'src/shared/dtos/auth.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly kafkaService: KafkaService,
    private readonly configService: ConfigService,
    private readonly googleService: GoogleService,
  ) {}

  private buildRefreshTokenCookieOptions(maxAge: number): Record<string, any> {
    const options: Record<string, any> = {
      httpOnly: true,
      secure: this.configService.get<string>('COOKIE_SECURE') !== 'false',
      sameSite: 'none' as const,
      maxAge,
    };
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    if (domain) options.domain = domain;
    return options;
  }

  private async verifyGoogleIdToken(token: string) {
    try {
      const payload = await this.googleService.verifyIdToken(token);
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return {
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        picture: payload.picture,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async register(body: RegisterDto) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.Register, body);
    } catch (error) {
      throw error;
    }
  }

  async registerOwner(body: RegisterOwnerDto) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.RegisterOwner, body);
    } catch (error) {
      throw error;
    }
  }

  async login(@Res({ passthrough: true }) res: Response, body: LoginDto) {
    try {
      const response = await this.kafkaService.sendWithTimeout(AuthTopics.Login, body);

      const cookieMaxAge = body.rememberMe ? CookieMaxAge.REMEMBER_ME : CookieMaxAge.DEFAULT;

      res.cookie('refreshToken', response.refreshToken, this.buildRefreshTokenCookieOptions(cookieMaxAge));

      return {
        accessToken: response.accessToken,
      };
    } catch (error) {
      throw error;
    }
  }

  async googleLoginMobile(
    @Res({ passthrough: true }) res: Response,
    token: string,
  ) {
    try {
      const userInfo = await this.verifyGoogleIdToken(token);

      const response = await this.kafkaService.sendWithTimeout(AuthTopics.Google, userInfo);

      res.cookie('refreshToken', response.refreshToken, this.buildRefreshTokenCookieOptions(CookieMaxAge.DEFAULT));

      return {
        accessToken: response.accessToken,
      };
    } catch (error) {
      throw error;
    }
  }

  async googleCallback(@Res({ passthrough: true }) res: Response, user: any) {
    try {
      const response = await this.kafkaService.sendWithTimeout(AuthTopics.Google, user);

      res.cookie('refreshToken', response.refreshToken, this.buildRefreshTokenCookieOptions(CookieMaxAge.DEFAULT));

      return res.redirect(
        `${this.configService.get<string>('FRONTEND_URL')}/auth-google`,
      );
    } catch (error) {
      throw error;
    }
  }

  async forgotPasswordOTP(body: ForgotPasswordOTPDto) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.ForgotPasswordOtp, body);
    } catch (error) {
      throw error;
    }
  }

  async resetPasswordOTP(body: ResetPasswordOTPDto) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.ResetPasswordOtp, body);
    } catch (error) {
      throw error;
    }
  }

  async validateOtp(body: ValidateOTPDto, purpose: string) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.ValidateOtp, { ...body, purpose });
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(body: ResetPasswordDto & { userId: string }) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.ResetPassword, body);
    } catch (error) {
      throw error;
    }
  }

  async verifyEmail(token: string) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.VerifyEmail, { token });
    } catch (error) {
      throw error;
    }
  }

  async externalResendVerifyEmail(userId: string) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.ExternalResendVerifyEmail, { userId });
    } catch (error) {
      throw error;
    }
  }

  async resendVerifyEmail(userId: string) {
    try {
      return await this.kafkaService.sendWithTimeout(AuthTopics.ResendVerifyEmail, { userId });
    } catch (error) {
      throw error;
    }
  }

  async me(user: CurrentUserDto) {
    try {
      const userInfo = await this.kafkaService.sendWithTimeout(UserTopics.Get, { userId: user.id });

      return {
        ...userInfo,
        ...user,
      };
    } catch (error) {
      throw error;
    }
  }

  async refresh(res: Response, refreshToken: string) {
    const response = await this.kafkaService.sendWithTimeout(AuthTopics.Refresh, { refreshToken });

    const newTokenPayload = JSON.parse(
      Buffer.from(response.refreshToken.split('.')[1], 'base64').toString(),
    );
    const cookieMaxAge = newTokenPayload.exp * 1000 - Date.now();

    res.cookie('refreshToken', response.refreshToken, this.buildRefreshTokenCookieOptions(cookieMaxAge));
    return {
      accessToken: response.accessToken,
    };
  }
}
