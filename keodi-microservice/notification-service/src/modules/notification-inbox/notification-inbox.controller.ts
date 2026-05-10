import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  NotificationInboxTopics,
  NotificationTopics,
} from 'src/shared/constants/topic.contant';
import { GetInboxPayload, MarkAsReadPayload, PersistInboxEvent, UserIdPayload } from 'src/shared/interfaces/notification.interface';
import { NotificationInboxService } from './notification-inbox.service';

@Controller()
export class NotificationInboxController {
  constructor(private readonly inboxService: NotificationInboxService) {}

  @EventPattern(NotificationTopics.PersistInbox)
  async persist(@Payload() payload: PersistInboxEvent) {
    return this.inboxService.upsertByEventId(payload);
  }

  @MessagePattern(NotificationInboxTopics.GetInbox)
  async getInbox(@Payload() payload: GetInboxPayload) {
    return this.inboxService.getByUserId(payload);
  }

  @MessagePattern(NotificationInboxTopics.MarkAsRead)
  async markAsRead(@Payload() payload: MarkAsReadPayload) {
    return this.inboxService.markAsRead(payload);
  }

  @MessagePattern(NotificationInboxTopics.MarkAllAsRead)
  async markAllAsRead(@Payload() payload: UserIdPayload) {
    return this.inboxService.markAllAsRead(payload);
  }

  @MessagePattern(NotificationInboxTopics.GetUnreadCount)
  async getUnreadCount(@Payload() payload: UserIdPayload) {
    return this.inboxService.getUnreadCount(payload);
  }
}
