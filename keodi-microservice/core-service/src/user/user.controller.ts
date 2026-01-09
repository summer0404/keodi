import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @EventPattern('user.create')
  async create(
    @Payload() data: { 
      userId: number,
      firstName?: string,
      lastName?: string ,
      picture?: string
    }
  ){
    return await this.userService.create(
      data.userId,
      data.firstName,
      data.lastName,
      data.picture
    )
  }


  @MessagePattern('user.update-picture')
  async updatePicture(
    @Payload() data: { 
      file: Buffer,
      userId: number,
      type?: string
    }
  ){
    return await this.userService.updatePicture(
      data.file,
      data.userId,
      data.type
    )
  }
}
