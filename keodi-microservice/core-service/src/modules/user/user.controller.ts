import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { UpdateUserProfileDto } from 'src/common/dtos/user.dto';
import { UserService } from './user.service';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) { }

  @EventPattern('user.create')
  async create(@Payload() data: { userId: string }) {
    return await this.userService.create(data.userId)
  }


  @MessagePattern('user.update-picture')
  async updatePicture(
    @Payload() data: {
      file: Buffer,
      userId: string,
      type?: string
    }
  ) {
    return await this.userService.updatePicture(
      data.file,
      data.userId,
      data.type
    )
  }

  @MessagePattern('user.get')
  async getById(
    @Payload() data: { userId: string }
  ) {
    return await this.userService.getById(data.userId)
  }

  @MessagePattern('user.get-all')
  async getAll() {
    return await this.userService.getAll();
  }

  @MessagePattern('user.update-profile')
  async updateProfile(
    @Payload() data: {
      userId: string,
      data: UpdateUserProfileDto
    }) {
    return await this.userService.updateProfile(
      data.userId,
      data.data
    )
  }

  @MessagePattern('user.onboarding')
  async onBoarding(
    @Payload() data: {
      userId: string,
      categoryIds: string[]
    }
  ) {
    return await this.userService.onBoarding(
      data.userId,
      data.categoryIds
    )
  }
}
