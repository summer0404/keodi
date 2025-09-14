import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LoginDto, RegisterDto } from 'src/dtos/auth.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.register')
  async register(@Payload() data: RegisterDto){
    return await this.authService.register(data)
  }

  @MessagePattern('auth.login')
  async login(@Payload() data: LoginDto){
    return await this.authService.login(data)
  }

  @MessagePattern('auth.google')
  async googleCallback(@Payload() data: any){
    return await this.authService.googleCallback(data)
  }
}
