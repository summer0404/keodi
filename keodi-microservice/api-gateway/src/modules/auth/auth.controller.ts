import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  ForgotPasswordOTPDto,
  ForgotPasswordOTPResponseDto,
  LoginDto,
  MeResponseDto,
  RegisterDto,
  RegisterOkResponseDto,
  ResetPasswordDto,
  ResetPasswordOTPDto,
  ResetPasswordOTPResponseDto,
  ResetPasswordResponseDto,
  UnverifiedAccountResponse,
  ValidateForgotPasswordOTPResponseDto,
  ValidateOTPDto,
  ValidateResetPasswordOTPResponseDto,
} from 'src/common/dtos/auth.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OtpPurpose } from 'src/common/enums/otp.enum';
import { SkipAuth } from 'src/common/decorators/skip-auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/common/dtos/user.dto';

@ApiTags('auth')
@ApiBadRequestResponse({ description: 'Invalid input data' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @SkipAuth()
  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiOkResponse({
    description: 'Registration successful',
    type: RegisterOkResponseDto,
  })
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body);
  }

  @SkipAuth()
  @Post('login')
  @ApiOperation({ summary: 'Login' })
  @ApiOkResponse({ description: 'Login successful', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid login credentials' })
  @ApiForbiddenResponse({
    description: 'Returns message notify that user email is not verified',
    type: UnverifiedAccountResponse,
  })
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() body: LoginDto,
  ) {
    return await this.authService.login(res, body);
  }

  @SkipAuth()
  @Get('google')
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({ description: 'Redirect to Google account selection page' })
  @UseGuards(AuthGuard('google'))
  async googleLogin() {}

  @SkipAuth()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google callback for backend' })
  @ApiResponse({
    description: 'Redirect to frontend login result page (/auth-google)',
  })
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Res() res: Response, @Req() req: any) {
    if (!req.user)
      throw new UnauthorizedException({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Google login failed!',
      });

    return await this.authService.googleCallback(res, req.user);
  }

  @SkipAuth()
  @Post('forgot-password-otp')
  @ApiOperation({
    summary: 'Send OTP email for password reset. OTP is valid in 3 minutes',
  })
  @ApiOkResponse({
    description:
      'Sends an email containing an OTP to verify the user. The frontend should navigate the user to the OTP input page.',
    type: ForgotPasswordOTPResponseDto,
  })
  async forgotPasswordOTP(@Body() body: ForgotPasswordOTPDto) {
    return await this.authService.forgotPasswordOTP(body);
  }

  @ApiBearerAuth('access-token')
  @Post('reset-password-otp')
  @ApiOperation({
    summary: 'Send OTP email for password reset. OTP is valid in 5 minutes',
  })
  @ApiOkResponse({
    description:
      'Sends an email containing an OTP to verify the user. The frontend should navigate the user to the OTP input page.',
    type: ResetPasswordOTPResponseDto,
  })
  async resetPasswordOTP(@Body() body: ResetPasswordOTPDto) {
    return await this.authService.resetPasswordOTP(body);
  }

  @SkipAuth()
  @Post('validate-forgot-password-otp')
  @ApiOperation({
    summary: 'Validate OTP sent to user by email to reset password. ',
  })
  @ApiOkResponse({
    description:
      'Sends an reset token, frontend should set Authorization header with this token to reset password',
    type: ValidateForgotPasswordOTPResponseDto,
  })
  async validateForgotPasswordOtp(@Body() body: ValidateOTPDto) {
    return await this.authService.validateOtp(body, OtpPurpose.FORGOT_PASSWORD);
  }

  @SkipAuth()
  @Post('validate-reset-password-otp')
  @ApiOperation({
    summary: 'Validate OTP sent to user by email to reset password. ',
  })
  @ApiOkResponse({
    description:
      'Sends an reset token, frontend should set Authorization header with this token to reset password',
    type: ValidateResetPasswordOTPResponseDto,
  })
  async validateResetPasswordOtp(@Body() body: ValidateOTPDto) {
    return await this.authService.validateOtp(body, OtpPurpose.RESET_PASSWORD);
  }

  @ApiBearerAuth('access-token')
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiOkResponse({
    description:
      'Sends a object containing message inform that change password successfully',
    type: ResetPasswordResponseDto,
  })
  async resetPassword(@Req() req: any, @Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword({
      newPassword: body.newPassword,
      userId: req.user?.id,
    });
  }

  @SkipAuth()
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify Email' })
  @ApiResponse({
    description:
      'Returns an HTML page notifying successful or failed email verification',
  })
  async verifyEmail(@Param('token') token: string) {
    return await this.authService.verifyEmail(token);
  }

  @SkipAuth()
  @Get('external-resend-verify-email/:userId')
  @ApiOperation({ summary: 'Resend verify email - use by email' })
  @ApiResponse({
    description:
      'Returns an HTML page notifying successful or failed email resend',
  })
  async externalResendVerifyEmail(@Param('userId') userId: string) {
    return await this.authService.externalResendVerifyEmail(userId);
  }

  @SkipAuth()
  @Get('resend-verify-email/:userId')
  @ApiOperation({ summary: 'Resend verify email' })
  @ApiOkResponse({
    description: 'Returns message notify that successfully resend email',
  })
  async resendVerifyEmail(@Param('userId') userId: string) {
    return await this.authService.resendVerifyEmail(userId);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user info' })
  @ApiOkResponse({
    description: 'Returns current user info',
    type: MeResponseDto,
  })
  async me(@CurrentUser() user: CurrentUserDto) {
    return await this.authService.me(user);
  }
}
