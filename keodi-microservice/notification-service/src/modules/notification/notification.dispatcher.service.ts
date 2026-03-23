import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  NotificationPreferredChannel,
  NotificationStatus,
  NotificationTopics,
} from 'src/shared/constants/notification.constant';
import { DispatchNotificationEvent } from './notification.dispatch.controller';
import { NotificationHelper } from './notification.helper';

@Injectable()
export class NotificationDispatcherService {
  constructor(
    private readonly kafkaService: KafkaService,
    private readonly fcmService: FcmService,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async dispatch(evt: DispatchNotificationEvent): Promise<void> {
    const kafka = this.kafkaService.getClient();
    const channel = evt.preferredChannel ?? NotificationPreferredChannel.BOTH;

    //persist pending
    kafka.emit(NotificationTopics.PersistInbox, {
      ...evt,
      channel,
      status: NotificationStatus.PENDING,
    });

    const isOnline = await this.notificationHelper.isOnline(
      evt.userId,
    );
    let delivered = false;

    //For online users: Websocket
    if (
      isOnline &&
      (channel === NotificationPreferredChannel.WEBSOCKET ||
        channel === NotificationPreferredChannel.BOTH)
    ) {
      kafka.emit(NotificationTopics.RealtimePush, {
        userId: evt.userId,
        event: evt,
      });
      delivered = true;
    }

    if (
      (!isOnline || channel === NotificationPreferredChannel.BOTH) &&
      channel !== NotificationPreferredChannel.WEBSOCKET
    ) {
      try {
        const tokensRes = await firstValueFrom(
          kafka.send(NotificationTopics.GetActiveTokens, {
            userId: evt.userId,
          }),
        );

        const tokens: string[] = tokensRes?.tokens ?? [];
        if (tokens.length) {
          const invalidTokens = await this.fcmService.sendMulticast(tokens, {
            title: evt.title,
            body: evt.body,
            data: evt.data as Record<string, string> | undefined,
          });

          //Deactive invalid tokens
          for (const token of invalidTokens) {
            kafka.emit(NotificationTopics.DeactivateToken, {
              userId: evt.userId,
              token,
            });
          }
          delivered = true;
        }
      } catch (error) {
        // FCM failure is non-fatal; notification is already persisted as PENDING
      }
    }
    if (delivered) {
      kafka.emit(NotificationTopics.PersistInbox, {
        ...evt,
        channel,
        status: NotificationStatus.SENT,
        deliveredAt: new Date().toISOString(),
      });
    }
  }
}
