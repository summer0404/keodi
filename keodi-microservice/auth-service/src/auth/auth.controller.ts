import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto
} from 'src/dtos/auth.dto';
import { ValidateOTPDto } from 'src/dtos/otp.dto';
import { OtpPurpose } from 'src/enums/otp.enum';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @MessagePattern('auth.register')
  async register(@Payload() data: RegisterDto) {
    return await this.authService.register(data)
  }

  @MessagePattern('auth.login')
  async login(@Payload() data: LoginDto) {
    return await this.authService.login(data)
  }

  @MessagePattern('auth.google')
  async googleCallback(@Payload() data: any) {
    return await this.authService.googleCallback(data)
  }

  @MessagePattern('auth.forgot-password-otp')
  async forgotPasswordOTP(@Payload() data: { email: string }) {
    return await this.authService.sendOTPWithPurpose(data.email, OtpPurpose.FORGOT_PASSWORD)
  }

  @MessagePattern('auth.reset-password-otp')
  async resetPasswordOTP(@Payload() data: { email: string }) {
    return await this.authService.sendOTPWithPurpose(data.email, OtpPurpose.RESET_PASSWORD)
  }

  @MessagePattern('auth.validate-otp')
  async validateOTP(@Payload() data: ValidateOTPDto) {
    return await this.authService.validateOTPWithPurpose(data)
  }

  @MessagePattern('auth.reset-password')
  async resetPassword(@Payload() data: ResetPasswordDto) {
    return await this.authService.resetPassword(data)
  }
}
