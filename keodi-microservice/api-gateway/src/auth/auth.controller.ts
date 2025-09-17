import { Body, Controller, Get, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  ValidateForgotPasswordOTPResponseDto,
  ValidateOTPDto
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

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send OTP email for password reset' })
  @ApiOkResponse({
    description: 'Sends an email containing an OTP to verify the user. The frontend should navigate the user to the OTP input page.',
    type: ForgotPasswordResponseDto
  })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body)
  }

  @Post('validate-forgot-password-otp')
  @ApiOperation({ summary: 'Validate OTP sent to user by email to reset password' })
  @ApiOkResponse({
    description: 'Sends an reset token, frontend should set Authorization header with this token to reset password',
    type: ValidateForgotPasswordOTPResponseDto
  })
  async validateForgotPasswordOtp(@Body() body: ValidateOTPDto) {
    return await this.authService.validateForgotPassworOtp(body)
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
