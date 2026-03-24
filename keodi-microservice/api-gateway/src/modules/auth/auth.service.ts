import { Injectable, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { GoogleService } from 'src/providers/google/google.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  ForgotPasswordOTPDto,
  LoginDto,
  RegisterDto,
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
      return await firstValueFrom(this.kafkaService.getClient().send('auth.register', body));
    } catch (error) {
      throw error;
    }
  }

  async login(@Res({ passthrough: true }) res: Response, body: LoginDto) {
    try {
      const response = await firstValueFrom(
        this.kafkaService.getClient().send('auth.login', body),
      );

      const cookieMaxAge = body.rememberMe
        ? 365 * 24 * 60 * 60 * 1000 // 1 year
        : 7 * 24 * 60 * 60 * 1000; // 7 days

      res.cookie('refreshToken', response.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: cookieMaxAge,
      });

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

      const response = await firstValueFrom(
        this.kafkaService.getClient().send('auth.google', userInfo),
      );

      res.cookie('refreshToken', response.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        accessToken: response.accessToken,
      };
    } catch (error) {
      throw error;
    }
  }

  async googleCallback(@Res({ passthrough: true }) res: Response, user: any) {
    try {
      const response = await firstValueFrom(
        this.kafkaService.getClient().send('auth.google', user),
      );

      res.cookie('refreshToken', response.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.redirect(
        `${this.configService.get<string>('FRONTEND_URL')}/auth-google`,
      );
    } catch (error) {
      throw error;
    }
  }

  async forgotPasswordOTP(body: ForgotPasswordOTPDto) {
    try {
      return await firstValueFrom(
        this.kafkaService.getClient().send('auth.forgot-password-otp', body),
      );
    } catch (error) {
      throw error;
    }
  }

  async resetPasswordOTP(body: ResetPasswordOTPDto) {
    try {
      return await firstValueFrom(
        this.kafkaService.getClient().send('auth.reset-password-otp', body),
      );
    } catch (error) {
      throw error;
    }
  }

  async validateOtp(body: ValidateOTPDto, purpose: string) {
    try {
      return await firstValueFrom(
        this.kafkaService.getClient().send('auth.validate-otp', { ...body, purpose }),
      );
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(body: ResetPasswordDto & { userId: string }) {
    try {
      return await firstValueFrom(
        this.kafkaService.getClient().send('auth.reset-password', body),
      );
    } catch (error) {
      throw error;
    }
  }

  async verifyEmail(token: string) {
    try {
      return await firstValueFrom(
        this.kafkaService.getClient().send('auth.verify-email', { token }),
      );
    } catch (error) {
      throw error;
    }
  }

  async externalResendVerifyEmail(userId: string) {
    try {
      return await firstValueFrom(
        this.kafkaService.getClient().send('auth.external-resend-verify-email', { userId }),
      );
    } catch (error) {
      throw error;
    }
  }

  async resendVerifyEmail(userId: string) {
    try {
      return await firstValueFrom(
        this.kafkaService.getClient().send('auth.resend-verify-email', { userId }),
      );
    } catch (error) {
      throw error;
    }
  }

  async me(user: CurrentUserDto) {
    try {
      const userInfo = await firstValueFrom(
        this.kafkaService.getClient().send('user.get', { userId: user.id }),
      );

      return {
        ...userInfo,
        ...user,
      };
    } catch (error) {
      throw error;
    }
  }

  async refresh(res: Response, refreshToken: string) {
    const response = await firstValueFrom(
      this.kafkaService.getClient().send('auth.refresh', { refreshToken }),
    );

    const newTokenPayload = JSON.parse(
      Buffer.from(response.refreshToken.split('.')[1], 'base64').toString(),
    );
    const cookieMaxAge = newTokenPayload.exp * 1000 - Date.now();

    res.cookie('refreshToken', response.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: cookieMaxAge,
    });
    return {
      accessToken: response.accessToken,
    };
  }
}
