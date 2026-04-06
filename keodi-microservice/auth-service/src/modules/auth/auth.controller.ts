import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from 'src/shared/dtos/auth.dto';
import { ValidateOTPDto } from 'src/shared/dtos/otp.dto';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';
import { AuthTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AuthTopics.Register)
  async register(@Payload() data: RegisterDto) {
    return await this.authService.register(data);
  }

  @MessagePattern(AuthTopics.Login)
  async login(@Payload() data: LoginDto) {
    return await this.authService.login(data);
  }

  @MessagePattern(AuthTopics.Google)
  async googleLogin(@Payload() data: any) {
    return await this.authService.googleLogin(data);
  }

  @MessagePattern(AuthTopics.ForgotPasswordOtp)
  async forgotPasswordOTP(@Payload() data: { email: string }) {
    return await this.authService.sendOTPWithPurpose(
      data.email,
      OtpPurpose.FORGOT_PASSWORD,
    );
  }

  @MessagePattern(AuthTopics.ResetPasswordOtp)
  async resetPasswordOTP(@Payload() data: { email: string }) {
    return await this.authService.sendOTPWithPurpose(
      data.email,
      OtpPurpose.RESET_PASSWORD,
    );
  }

  @MessagePattern(AuthTopics.ValidateOtp)
  async validateOTP(@Payload() data: ValidateOTPDto) {
    return await this.authService.validateOTPWithPurpose(data);
  }

  @MessagePattern(AuthTopics.ResetPassword)
  async resetPassword(@Payload() data: ResetPasswordDto) {
    return await this.authService.resetPassword(data);
  }

  @MessagePattern(AuthTopics.VerifyEmail)
  async verifyEmail(@Payload() data: { token: string }) {
    return await this.authService.verifyEmail(data.token);
  }

  @MessagePattern(AuthTopics.ExternalResendVerifyEmail)
  async externalResendVerifyEmail(@Payload() data: { userId: string }) {
    return await this.authService.externalResendVerifyEmail(
      data.userId,
      VerifyUrlPurpose.VERIFY_EMAIL,
    );
  }

  @MessagePattern(AuthTopics.ResendVerifyEmail)
  async resendVerifyEmail(@Payload() data: { userId: string }) {
    return await this.authService.resendVerifyEmail(
      data.userId,
      VerifyUrlPurpose.VERIFY_EMAIL,
    );
  }

  @MessagePattern(AuthTopics.Refresh)
  async refresh(@Payload() data: { refreshToken: string }) {
    return await this.authService.refresh(data.refreshToken);
  }
}
