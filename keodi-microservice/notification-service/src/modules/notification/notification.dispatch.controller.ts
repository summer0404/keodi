import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationDispatcherService } from './notification.dispatcher.service';
import { DispatchNotificationEvent } from 'src/shared/interfaces/notification.interface';
import { NotificationTopics } from 'src/shared/constants/topic.contant';

@Controller()
export class NotificationDispatchController {
  constructor(private readonly dispatcher: NotificationDispatcherService) { }

  @EventPattern(NotificationTopics.Dispatch)
  async dispatch(@Payload() payload: DispatchNotificationEvent) {
    await this.dispatcher.dispatch(payload);
  }
}
