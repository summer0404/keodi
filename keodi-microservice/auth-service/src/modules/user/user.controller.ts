import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern(UserTopics.Unverify)
  async unverifyUser(@Payload() data: { userId: string }){
    return await this.userService.unverifyUser(data.userId)
  }

  @MessagePattern(UserTopics.UpdateUsername)
  async updateUsername(@Payload() data: { userId: string; username: string; accessToken: string }){
    return await this.userService.updateUsername(data.userId, data.username, data.accessToken)
  }

}
