import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationTopics } from 'src/shared/constants/notification.constant';
import { NotificationDispatcherService } from './notification.dispatcher.service';
import { DispatchNotificationEvent } from 'src/shared/interfaces/notification.interface';

@Controller()
export class NotificationDispatchController {
  constructor(private readonly dispatcher: NotificationDispatcherService) { }

  @EventPattern(NotificationTopics.Dispatch)
  async dispatch(@Payload() payload: DispatchNotificationEvent) {
    await this.dispatcher.dispatch(payload);
  }
}
