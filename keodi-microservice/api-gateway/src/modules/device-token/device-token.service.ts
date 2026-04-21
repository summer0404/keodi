import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { UpsertDeviceTokenDto } from 'src/shared/dtos/device-token.dto';
import { DeviceTokenTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class DeviceTokenService {
  constructor(private readonly kafkaService: KafkaService) {}

  upsert(userId: string, upsertDeviceTokenDto: UpsertDeviceTokenDto) {
    this.kafkaService.getClient().emit(DeviceTokenTopics.UpsertToken, {
      userId,
      token: upsertDeviceTokenDto.token,
      platform: upsertDeviceTokenDto.platform,
      deviceId: upsertDeviceTokenDto.deviceId,
      appVersion: upsertDeviceTokenDto.appVersion,
    });
  }
}
