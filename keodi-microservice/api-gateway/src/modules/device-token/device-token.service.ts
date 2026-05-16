import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { DeviceTokenTopics } from 'src/shared/constants/topic.constant';
import { UpsertDeviceTokenDto } from 'src/shared/dtos/device-token.dto';

@Injectable()
export class DeviceTokenService {
  constructor(private readonly kafkaService: KafkaService) {}

  upsert(userId: string, upsertDeviceTokenDto: UpsertDeviceTokenDto) {
    this.kafkaService.getClient().emit(DeviceTokenTopics.UpsertToken, {
      userId,
      ...upsertDeviceTokenDto,
    });
  }
}
