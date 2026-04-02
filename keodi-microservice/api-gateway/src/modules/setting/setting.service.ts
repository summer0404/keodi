import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { UpdateUserSettingDto } from 'src/shared/dtos/setting.dto';

@Injectable()
export class SettingService {
  constructor(private readonly kafkaService: KafkaService) {}

  async get(userId: string) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('setting.get', userId),
    );
  }

  async update(userId: string, updateUserSettingDto: UpdateUserSettingDto) {
    return await firstValueFrom(this.kafkaService.getClient().send('setting.update', {userId, updateUserSettingDto}))
  }
}
