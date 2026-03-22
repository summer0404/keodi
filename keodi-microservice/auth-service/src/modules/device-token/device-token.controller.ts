import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { DevicePlatform } from '@prisma/client';
import { NotificationTopics } from 'src/shared/constants/notification.constant';
import { DeviceTokenService } from './device-token.service';

@Controller()
export class DeviceTokenController {
  constructor(private readonly service: DeviceTokenService) {}

  @MessagePattern(NotificationTopics.GetActiveTokens)
  async getActive(@Payload() payload: { userId: string }) {
    const tokens = await this.service.getActiveTokens(payload.userId);
    return { userId: payload.userId, tokens };
  }

  @EventPattern(NotificationTopics.UpsertToken)
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

  @EventPattern(NotificationTopics.DeactivateToken)
  async deactive(@Payload() payload: { token: string }) {
    return this.service.deactivateToken(payload.token);
  }
}
