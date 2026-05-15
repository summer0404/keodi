import { Injectable } from '@nestjs/common';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { fcmUserTopic } from 'src/shared/constants/fcm.constant';
import { NOTIFICATION_SETTING_MAP } from 'src/shared/constants/notification.constant';
import {
  NotificationTopics,
  SettingTopics,
} from 'src/shared/constants/topic.contant';
import {
  NotificationPreferredChannel,
  NotificationStatus,
} from 'src/shared/enums/notification.enum';
import { DispatchNotificationEvent } from 'src/shared/interfaces/notification.interface';
import { NotificationHelper } from './notification.helper';

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
        const settings = await this.kafkaService.sendWithTimeout(
          SettingTopics.Get,
          { userId: event.userId },
        );
        if (settings?.[settingKey] === false) {
          return;
        }
      } catch {}
    }

    const channel = event.preferredChannel ?? NotificationPreferredChannel.BOTH;

    //persist pending
    kafka.emit(NotificationTopics.PersistInbox, {
      ...event,
      channel,
      status: NotificationStatus.PENDING,
    });

    const isOnline = await this.notificationHelper.isOnline(event.userId);
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

    if (channel !== NotificationPreferredChannel.WEBSOCKET) {
      try {
        const fcmData = event.data
          ? Object.fromEntries(
              Object.entries(event.data).map(([k, v]) => [k, String(v)]),
            )
          : undefined;

        await this.fcmService.sendToTopic(fcmUserTopic(event.userId), {
          title: event.title,
          body: event.body,
          data: fcmData,
        });
        delivered = true;
      } catch (error) {}
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
