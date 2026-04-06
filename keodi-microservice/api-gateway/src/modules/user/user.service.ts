import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { UpdateUserProfileDto } from 'src/shared/dtos/user.dto';
import { UserTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class UserService {
  constructor(private readonly kafkaService: KafkaService) {}

  async unverifyUser(userId: string) {
    return await this.kafkaService.sendWithTimeout(UserTopics.Unverify, { userId });
  }

  async updateUsername(userId: string, username: string, accessToken: string) {
    return await this.kafkaService.sendWithTimeout(UserTopics.UpdateUsername, { userId, username, accessToken });
  }

  async updatePicture(userId: string, file: Buffer, type: string) {
    return await this.kafkaService.sendWithTimeout(UserTopics.UpdatePicture, { userId, file, type });
  }

  async updateProfile(userId: string, data: UpdateUserProfileDto) {
    return await this.kafkaService.sendWithTimeout(UserTopics.UpdateProfile, { userId, data });
  }

  async getAll() {
    return await this.kafkaService.sendWithTimeout(UserTopics.GetAll, {});
  }

  async onBoarding(userId: string, categoryIds: string[]) {
    return await this.kafkaService.sendWithTimeout(UserTopics.Onboarding, { userId, categoryIds });
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    this.kafkaService
      .getClient()
      .emit(UserTopics.UpdateLocation, { userId, latitude, longitude });
  }
}
