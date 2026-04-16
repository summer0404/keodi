import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { UserTopics } from 'src/shared/constants/topic.constant';
import {
  CreateUserDto,
  UpdateUserProfileDto,
  SyncUsernameDto,
} from 'src/shared/dtos/user.dto';
import { UserService } from './user.service';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern(UserTopics.Create)
  async create(@Payload() data: CreateUserDto) {
    return await this.userService.create(data);
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
  async getById(@Payload() data: { userId: string }) {
    return await this.userService.getById(data.userId);
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
  async onBoarding(@Payload() data: { userId: string; categoryIds: string[] }) {
    return await this.userService.onBoarding(data.userId, data.categoryIds);
  }

  @MessagePattern(UserTopics.GetOtherProfile)
  async getOtherProfile(
    @Payload() data: { viewerId: string; targetUserId: string },
  ) {
    return await this.userService.getOtherProfile(
      data.viewerId,
      data.targetUserId,
    );
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

  @MessagePattern(UserTopics.UsernameSynced)
  async syncUsername(@Payload() data: SyncUsernameDto) {
    return await this.userService.syncUsername(data);
  }
}
