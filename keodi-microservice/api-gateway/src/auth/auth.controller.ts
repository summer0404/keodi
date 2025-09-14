import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterResponseDto } from 'src/dtos/auth.dto';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('auth')
@ApiBadRequestResponse({ description: 'Lỗi dữ liệu đầu vào' })
@ApiInternalServerErrorResponse({ description: 'Lỗi máy chủ' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký người dùng' })
  @ApiOkResponse({ description: 'Người dùng đăng ký thành công', type: RegisterResponseDto })
  register(@Res({ passthrough: true}) res: Response, @Body() body: RegisterDto) {
    return this.authService.register(res, body)
  }
}
