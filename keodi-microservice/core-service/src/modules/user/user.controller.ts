import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { UpdateUserProfileDto } from 'src/shared/dtos/user.dto';
import { UserService } from './user.service';
import { UserTopics } from 'src/shared/constants/topic.constant';


@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @EventPattern(UserTopics.Create)
  async create(@Payload() data: { userId: string }) {
    return await this.userService.create(data.userId);
  }


  @MessagePattern(UserTopics.UpdatePicture)
  async updatePicture(
    @Payload() data: { file: Buffer; userId: string; type?: string },
  ) {
    return await this.userService.updatePicture(
      data.file,
      data.userId,
      data.type,
    );
  }

  @MessagePattern(UserTopics.Get)
  async getById(
    @Payload() data: { userId: string }
  ) {
    return await this.userService.getById(data.userId)
  }

  @MessagePattern(UserTopics.GetAll)
  async getAll() {
    return await this.userService.getAll();
  }

  @MessagePattern(UserTopics.UpdateProfile)
  async updateProfile(
    @Payload() data: { userId: string; data: UpdateUserProfileDto },
  ) {
    return await this.userService.updateProfile(data.userId, data.data);
  }

  @MessagePattern(UserTopics.Onboarding)
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

  @EventPattern(UserTopics.UpdateLocation)
  async updateLocation(
    @Payload() data: { userId: string; latitude: number; longitude: number },
  ) {
    await this.userService.updateLocation(
      data.userId,
      data.latitude,
      data.longitude,
    );
  }
}
