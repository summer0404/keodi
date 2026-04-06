import { Injectable } from '@nestjs/common';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  NotificationPreferredChannel,
  NotificationStatus,
  NotificationType,
} from 'src/shared/constants/notification.constant';
import { NotificationHelper } from './notification.helper';
import { DispatchNotificationEvent } from 'src/shared/interfaces/notification.interface';
import { DeviceTokenTopics, NotificationTopics, SettingTopics } from 'src/shared/constants/topic.contant';

const NOTIFICATION_SETTING_MAP: Partial<Record<NotificationType, string>> = {
  [NotificationType.GROUP_INVITE]: 'notifyGroupInvites',
  [NotificationType.GROUP_VOTE_FINALIZED]: 'notifyVotingResults',
  [NotificationType.GROUP_VOTE_REMINDER]: 'notifyVotingResults',
  [NotificationType.NEARBY_PLACE]: 'notifyNearbyPlaces',
  [NotificationType.RECOMMENDATION]: 'notifyRecommendations',
};

@Injectable()
export class NotificationDispatcherService {
  constructor(
    private readonly kafkaService: KafkaService,
    private readonly fcmService: FcmService,
    private readonly notificationHelper: NotificationHelper,
  ) {}

  async dispatch(event: DispatchNotificationEvent): Promise<void> {
    const kafka = this.kafkaService.getClient();

    // Check user notification preferences
    const settingKey = NOTIFICATION_SETTING_MAP[event.type];
    if (settingKey) {
      try {
        const settings = await this.kafkaService.sendWithTimeout(SettingTopics.Get, event.userId);
        if (settings?.[settingKey] === false) {
          return;
        }
      } catch { }
    }

    const channel = event.preferredChannel ?? NotificationPreferredChannel.BOTH;

    //persist pending
    kafka.emit(NotificationTopics.PersistInbox, {
      ...event,
      channel,
      status: NotificationStatus.PENDING,
    });

    const isOnline = await this.notificationHelper.isOnline(
      event.userId,
    );
    let delivered = false;

    //For online users: Websocket
    if (
      isOnline &&
      (channel === NotificationPreferredChannel.WEBSOCKET ||
        channel === NotificationPreferredChannel.BOTH)
    ) {
      kafka.emit(NotificationTopics.RealtimePush, {
        userId: event.userId,
        event: event,
      });
      delivered = true;
    }

    if (
      (!isOnline || channel === NotificationPreferredChannel.BOTH) &&
      channel !== NotificationPreferredChannel.WEBSOCKET
    ) {
      try {
        const tokensRes = await this.kafkaService.sendWithTimeout(DeviceTokenTopics.GetActiveTokens, {
          userId: event.userId,
        });

        const tokens: string[] = tokensRes?.tokens ?? [];
        if (tokens.length) {
          const invalidTokens = await this.fcmService.sendMulticast(tokens, {
            title: event.title,
            body: event.body,
            data: event.data as Record<string, string> | undefined,
          });

          //Deactive invalid tokens
          for (const token of invalidTokens) {
            kafka.emit(DeviceTokenTopics.DeactivateToken, {
              userId: event.userId,
              token,
            });
          }
          delivered = true;
        }
      } catch (error) { }
    }
    if (delivered) {
      kafka.emit(NotificationTopics.PersistInbox, {
        ...event,
        channel,
        status: NotificationStatus.SENT,
        deliveredAt: new Date().toISOString(),
      });
    }
  }
}
