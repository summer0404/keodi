import { Body, Controller, Get, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponseDto, LoginDto, RegisterDto } from 'src/dtos/auth.dto';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@ApiBadRequestResponse({ description: 'Lỗi dữ liệu đầu vào' })
@ApiInternalServerErrorResponse({ description: 'Lỗi máy chủ' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký người dùng' })
  @ApiOkResponse({ description: 'Đăng ký thành công', type: AuthResponseDto })
  register(@Res({ passthrough: true }) res: Response, @Body() body: RegisterDto) {
    return this.authService.register(res, body)
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiOkResponse({ description: 'Đăng nhập thành công', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Thông tin đăng nhập không chính xác' })
  login(@Res({ passthrough: true }) res: Response, @Body() body: LoginDto) {
    return this.authService.login(res, body)
  }

  @Get('google')
  @ApiOperation({ summary: 'Đăng nhập bằng google'})
  @ApiResponse({ description: 'Chuyển hướng tới trang chọn tài khoản của google'})
  @UseGuards(AuthGuard('google'))
  async googleLogin() { }

  @Get('google/callback')
  @ApiOperation({ summary: 'Kết quả trả về từ google cho backend' })
  @ApiResponse({ description: 'Chuyển hướng tới trang kết quả đăng nhập trên frontend (/auth-google)'})
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Res() res: Response, @Req() req: any) {
    if (!req.user) throw new UnauthorizedException({
      status: HttpStatus.UNAUTHORIZED,
      message: "Google login failed!"
    })

    return this.authService.googleCallback(res, req.user)
  }
}
