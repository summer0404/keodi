import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { NotificationInboxTopics } from 'src/shared/constants/topic.constant';
import { GetNotificationInboxQueryDto } from 'src/shared/dtos/notification-inbox.dto';

@Injectable()
export class NotificationInboxService {
  constructor(private readonly kafkaService: KafkaService) {}

  async getInbox(userId: string, query: GetNotificationInboxQueryDto) {
    return this.kafkaService.sendWithTimeout(NotificationInboxTopics.GetInbox, {
      userId,
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.kafkaService.sendWithTimeout(NotificationInboxTopics.MarkAsRead, {
      userId,
      notificationId,
    });
  }

  async markAllAsRead(userId: string) {
    return this.kafkaService.sendWithTimeout(NotificationInboxTopics.MarkAllAsRead, { userId });
  }

  async getUnreadCount(userId: string) {
    return this.kafkaService.sendWithTimeout(NotificationInboxTopics.GetUnreadCount, { userId });
  }
}
