import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { PresenceService } from 'src/providers/presence/presence.service';
import {
  NotificationPreferredChannel,
  NotificationStatus,
  NotificationTopics,
} from 'src/shared/constants/notification.constant';
import { DispatchNotificationEvent } from './notification.dispatch.controller';

@Injectable()
export class NotificationDispatcherService {
  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
    private readonly fcmService: FcmService,
    private readonly presenceService: PresenceService,
  ) {}

  async dispatch(evt: DispatchNotificationEvent): Promise<void> {
    const channel = evt.preferredChannel ?? NotificationPreferredChannel.BOTH;

    //persist pending
    this.kafka.emit(NotificationTopics.PersistInbox, {
      ...evt,
      channel,
      status: NotificationStatus.PENDING,
    });

    const isOnline = await this.presenceService.isOnline(evt.userId);
    let delivered = false;

    //For online users: Websocket
    if (
      isOnline &&
      (channel === NotificationPreferredChannel.WEBSOCKET ||
        channel === NotificationPreferredChannel.BOTH)
    ) {
      this.kafka.emit(NotificationTopics.RealtimePush, {
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
          this.kafka.send(NotificationTopics.GetActiveTokens, {
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
            this.kafka.emit(NotificationTopics.DeactivateToken, {
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
      this.kafka.emit(NotificationTopics.PersistInbox, {
        ...evt,
        channel,
        status: NotificationStatus.SENT,
        deliveredAt: new Date().toISOString(),
      });
    }
  }
}
