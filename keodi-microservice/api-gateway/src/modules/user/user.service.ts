import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ImageService } from 'src/providers/image/image.service';
import { ImageFolders } from 'src/shared/constants/image.constant';
import { UserTopics } from 'src/shared/constants/topic.constant';
import { UpdateUserProfileDto } from 'src/shared/dtos/user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly kafkaService: KafkaService,
    private readonly imageService: ImageService,
  ) {}

  async searchUsers(
    userId: string,
    keyword: string,
    page: number,
    limit: number,
  ) {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword)
      return { users: [], total: 0, page, totalPages: 0, limit };

    return await this.kafkaService.sendWithTimeout(UserTopics.SearchOthers, {
      userId,
      keyword: normalizedKeyword,
      page,
      limit,
    });
  }

  async unverifyUser(userId: string) {
    return await this.kafkaService.sendWithTimeout(UserTopics.Unverify, {
      userId,
    });
  }

  async updateUsername(userId: string, username: string, accessToken: string) {
    return await this.kafkaService.sendWithTimeout(UserTopics.UpdateUsername, {
      userId,
      username,
      accessToken,
    });
  }

  async updatePicture(userId: string, file: Buffer, type: string) {
    const key = await this.imageService.uploadAndGetKey(ImageFolders.USER, file, type);
    return await this.kafkaService.sendWithTimeout(UserTopics.UpdatePicture, {
      userId,
      key,
    });
  }

  async updateProfile(userId: string, data: UpdateUserProfileDto) {
    return await this.kafkaService.sendWithTimeout(UserTopics.UpdateProfile, {
      userId,
      data,
    });
  }

  async getAll() {
    return await this.kafkaService.sendWithTimeout(UserTopics.GetAll, {});
  }

  async getOtherProfile(viewerId: string, targetUserId: string) {
    return await this.kafkaService.sendWithTimeout(UserTopics.GetOtherProfile, {
      viewerId,
      targetUserId,
    });
  }

  async onBoarding(userId: string, categoryIds: string[]) {
    return await this.kafkaService.sendWithTimeout(UserTopics.Onboarding, {
      userId,
      categoryIds,
    });
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    this.kafkaService
      .getClient()
      .emit(UserTopics.UpdateLocation, { userId, latitude, longitude });
  }
}
