import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto
} from 'src/dtos/auth.dto';
import { ValidateOTPDto } from 'src/dtos/otp.dto';

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

  @MessagePattern('auth.forgot-password')
  async forgotPassword(@Payload() data: ForgotPasswordDto) {
    return await this.authService.forgotPassword(data)
  }

  @MessagePattern('auth.validate-forgot-password-otp')
  async validateForgotPasswordOTP(@Payload() data: (Omit<ValidateOTPDto, 'purpose'>)) {
    return await this.authService.validateForgotPasswordOTP(data)
  }

  @MessagePattern('auth.reset-password')
  async resetPassword(@Payload() data: ResetPasswordDto) {
    return await this.authService.resetPassword(data)
  }
}
