import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationGateway } from './notification.gateway';
import { NotificationTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class NotificationRealtimeController {
  constructor(private readonly gateway: NotificationGateway) {}

  @EventPattern(NotificationTopics.RealtimePush)
  async realtimePush(@Payload() payload: { userId: string; event: any }) {
    await this.gateway.pushToUser(payload.userId, payload.event);
  }
}
