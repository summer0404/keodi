import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { UpdateUserSettingDto } from 'src/shared/dtos/setting.dto';
import { SettingTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class SettingService {
  constructor(private readonly kafkaService: KafkaService) {}

  async get(userId: string) {
    return await this.kafkaService.sendWithTimeout(SettingTopics.Get, userId);
  }

  async update(userId: string, updateUserSettingDto: UpdateUserSettingDto) {
    return await this.kafkaService.sendWithTimeout(SettingTopics.Update, { userId, updateUserSettingDto });
  }
}
