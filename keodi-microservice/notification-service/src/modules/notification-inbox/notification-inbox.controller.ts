import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  NotificationInboxTopics,
  NotificationTopics,
} from 'src/shared/constants/topic.contant';
import { NotificationInboxService } from './notification-inbox.service';

@Controller()
export class NotificationInboxController {
  constructor(private readonly inboxService: NotificationInboxService) {}

  @EventPattern(NotificationTopics.PersistInbox)
  async persist(@Payload() payload: any) {
    return this.inboxService.upsertByEventId(payload);
  }

  @MessagePattern(NotificationInboxTopics.GetInbox)
  async getInbox(
    @Payload()
    payload: {
      userId: string;
      page: number;
      limit: number;
      unreadOnly?: boolean;
    },
  ) {
    return this.inboxService.getByUserId(payload);
  }

  @MessagePattern(NotificationInboxTopics.MarkAsRead)
  async markAsRead(
    @Payload() payload: { userId: string; notificationId: string },
  ) {
    return this.inboxService.markAsRead(payload);
  }

  @MessagePattern(NotificationInboxTopics.MarkAllAsRead)
  async markAllAsRead(@Payload() payload: { userId: string }) {
    return this.inboxService.markAllAsRead(payload);
  }

  @MessagePattern(NotificationInboxTopics.GetUnreadCount)
  async getUnreadCount(@Payload() payload: { userId: string }) {
    return this.inboxService.getUnreadCount(payload);
  }
}
