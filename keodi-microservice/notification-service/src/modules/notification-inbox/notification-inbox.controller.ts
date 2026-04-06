import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationInboxService } from './notification-inbox.service';
import { NotificationTopics } from 'src/shared/constants/topic.contant';

@Controller()
export class NotificationInboxController {
  constructor(private readonly inboxService: NotificationInboxService) {}

  @EventPattern(NotificationTopics.PersistInbox)
  async persist(@Payload() payload: any) {
    return this.inboxService.upsertByEventId(payload);
  }
}
