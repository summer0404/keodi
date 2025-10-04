import { Body, Controller, Get, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  ForgotPasswordOTPDto,
  ForgotPasswordOTPResponseDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ResetPasswordOTPDto,
  ResetPasswordOTPResponseDto,
  ResetPasswordResponseDto,
  ValidateForgotPasswordOTPResponseDto,
  ValidateOTPDto,
  ValidateResetPasswordOTPResponseDto
} from 'src/dtos/auth.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt.guard';
import { OtpPurpose } from 'src/enums/otp.enum';


@ApiTags('auth')
@ApiBadRequestResponse({ description: 'Invalid input data' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiOkResponse({ description: 'Registration successful', type: AuthResponseDto })
  async register(@Res({ passthrough: true }) res: Response, @Body() body: RegisterDto) {
    return await this.authService.register(res, body)
  }

  @Post('login')
  @ApiOperation({ summary: 'Login' })
  @ApiOkResponse({ description: 'Login successful', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid login credentials' })
  async login(@Res({ passthrough: true }) res: Response, @Body() body: LoginDto) {
    return await this.authService.login(res, body)
  }

  @Get('google')
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({ description: 'Redirect to Google account selection page' })
  @UseGuards(AuthGuard('google'))
  async googleLogin() { }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google callback for backend' })
  @ApiResponse({ description: 'Redirect to frontend login result page (/auth-google)' })
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Res() res: Response, @Req() req: any) {
    if (!req.user) throw new UnauthorizedException({
      status: HttpStatus.UNAUTHORIZED,
      message: "Google login failed!"
    })

    return await this.authService.googleCallback(res, req.user)
  }

  @Post('forgot-password-otp')
  @ApiOperation({ summary: 'Send OTP email for password reset. OTP is valid in 3 minutes' })
  @ApiOkResponse({
    description: 'Sends an email containing an OTP to verify the user. The frontend should navigate the user to the OTP input page.',
    type: ForgotPasswordOTPResponseDto
  })
  async forgotPasswordOTP(@Body() body: ForgotPasswordOTPDto) {
    return await this.authService.forgotPasswordOTP(body)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('reset-password-otp')
  @ApiOperation({ summary: 'Send OTP email for password reset. OTP is valid in 5 minutes' })
  @ApiOkResponse({
    description: 'Sends an email containing an OTP to verify the user. The frontend should navigate the user to the OTP input page.',
    type: ResetPasswordOTPResponseDto
  })
  async resetPasswordOTP(@Body() body: ResetPasswordOTPDto) {
    return await this.authService.resetPasswordOTP(body)
  }

  @Post('validate-forgot-password-otp')
  @ApiOperation({ summary: 'Validate OTP sent to user by email to reset password. ' })
  @ApiOkResponse({
    description: 'Sends an reset token, frontend should set Authorization header with this token to reset password',
    type: ValidateForgotPasswordOTPResponseDto
  })
  async validateForgotPasswordOtp(@Body() body: ValidateOTPDto) {
    return await this.authService.validateOtp(body, OtpPurpose.FORGOT_PASSWORD)
  }

  @Post('validate-reset-password-otp')
  @ApiOperation({ summary: 'Validate OTP sent to user by email to reset password. ' })
  @ApiOkResponse({
    description: 'Sends an reset token, frontend should set Authorization header with this token to reset password',
    type: ValidateResetPasswordOTPResponseDto
  })
  async validateResetPasswordOtp(@Body() body: ValidateOTPDto) {
    return await this.authService.validateOtp(body, OtpPurpose.RESET_PASSWORD)
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiOkResponse({
    description: 'Sends a object containing message inform that change password successfully',
    type: ResetPasswordResponseDto
  })
  async resetPassword(@Req() req: any, @Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword({
      newPassword: body.newPassword,
      userId: req.user?.id
    })
  }
}
