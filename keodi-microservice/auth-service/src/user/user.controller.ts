import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('user.unverify')
  async unverifyUser(@Payload() data: { userId: number }){
    return await this.userService.unverifyUser(data.userId)
  }
}
