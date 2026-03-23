import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationTopics } from 'src/shared/constants/notification-topic.constant';
import { NotificationGateway } from './notification.gateway';

@Controller()
export class NotificationRealtimeController {
  constructor(private readonly gateway: NotificationGateway) {}

  @EventPattern(NotificationTopics.RealtimePush)
  async realtimePush(@Payload() payload: { userId: string; event: any }) {
    await this.gateway.pushToUser(payload.userId, payload.event);
  }
}
