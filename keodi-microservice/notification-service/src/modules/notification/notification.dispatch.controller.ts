import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  NotificationPreferredChannel,
  NotificationTopics,
  NotificationType,
} from 'src/shared/constants/notification.constant';
import { NotificationDispatcherService } from './notification.dispatcher.service';

export interface DispatchNotificationEvent {
  eventId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, unknown>;
  preferredChannel: NotificationPreferredChannel;
  createdAt: string;
}

@Controller()
export class NotificationDispatchController {
  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  @EventPattern(NotificationTopics.Dispatch)
  async dispatch(@Payload() payload: DispatchNotificationEvent) {
    await this.dispatcher.dispatch(payload);
  }
}
