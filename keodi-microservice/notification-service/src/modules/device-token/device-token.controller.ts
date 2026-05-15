import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { DevicePlatform } from '@prisma/client';
import { DeviceTokenTopics } from 'src/shared/constants/topic.contant';
import { DeviceTokenService } from './device-token.service';

@Controller()
export class DeviceTokenController {
  constructor(private readonly service: DeviceTokenService) {}

  @MessagePattern(DeviceTokenTopics.GetActiveTokens)
  async getActive(@Payload() payload: { userId: string }) {
    const tokens = await this.service.getActiveTokens(payload.userId);
    return { userId: payload.userId, tokens };
  }

  @EventPattern(DeviceTokenTopics.UpsertToken)
  async upsert(
    @Payload()
    payload: {
      userId: string;
      token: string;
      platform: DevicePlatform;
      deviceId?: string;
      appVersion?: string;
    },
  ) {
    return this.service.upsertToken(payload);
  }

  @EventPattern(DeviceTokenTopics.DeactivateToken)
  async deactive(@Payload() payload: { token: string; userId?: string }) {
    return this.service.deactivateToken(payload);
  }
}
