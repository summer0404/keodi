import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { UpdateUserProfileDto } from 'src/shared/dtos/user.dto';

@Injectable()
export class UserService {
  constructor(private readonly kafkaService: KafkaService) {}

  async unverifyUser(userId: string) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('user.unverify', { userId }),
    );
  }

  async updateUsername(userId: string, username: string, accessToken: string) {
    return await firstValueFrom(
      this.kafkaService
        .getClient()
        .send('user.update-username', { userId, username, accessToken }),
    );
  }

  async updatePicture(userId: string, file: Buffer, type: string) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('user.update-picture', {
        userId,
        file,
        type,
      }),
    );
  }

  async updateProfile(userId: string, data: UpdateUserProfileDto) {
    return await firstValueFrom(
      this.kafkaService
        .getClient()
        .send('user.update-profile', { userId, data }),
    );
  }

  async getAll() {
    return await firstValueFrom(
      this.kafkaService.getClient().send('user.get-all', {}),
    );
  }

  async onBoarding(userId: string, categoryIds: string[]) {
    return await firstValueFrom(
      this.kafkaService
        .getClient()
        .send('user.onboarding', { userId, categoryIds }),
    );
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    this.kafkaService
      .getClient()
      .emit('user.update-location', { userId, latitude, longitude });
  }
}
