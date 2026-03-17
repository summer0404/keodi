import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationTopics } from 'src/shared/constants/notification-topic.constant';
import { NotificationInboxService } from './notification-inbox.service';

@Controller()
export class NotificationInboxController {
  constructor(private readonly inboxService: NotificationInboxService) {}

  @EventPattern(NotificationTopics.PersistInbox)
  async persist(@Payload() payload: any) {
    return this.inboxService.upsertByEventId(payload);
  }
}
