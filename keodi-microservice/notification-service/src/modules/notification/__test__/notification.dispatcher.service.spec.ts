import { Test, TestingModule } from '@nestjs/testing';
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
  NotificationType,
} from 'src/shared/enums/notification.enum';
import { DispatchNotificationEvent } from 'src/shared/interfaces/notification.interface';
import { NotificationDispatcherService } from '../notification.dispatcher.service';
import { NotificationHelper } from '../notification.helper';

const buildEvent = (
  overrides: Partial<DispatchNotificationEvent> = {},
): DispatchNotificationEvent => ({
  eventId: 'evt-1',
  userId: 'user-1',
  type: NotificationType.SYSTEM,
  title: 'Hello',
  body: 'World',
  preferredChannel: NotificationPreferredChannel.BOTH,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;
  let kafkaService: jest.Mocked<KafkaService>;
  let fcmService: jest.Mocked<FcmService>;
  let notificationHelper: jest.Mocked<NotificationHelper>;
  let kafkaClient: { emit: jest.Mock };

  beforeEach(async () => {
    kafkaClient = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        {
          provide: KafkaService,
          useValue: {
            getClient: jest.fn().mockReturnValue(kafkaClient),
            sendWithTimeout: jest.fn(),
          },
        },
        {
          provide: FcmService,
          useValue: {
            sendToTopic: jest.fn(),
          },
        },
        {
          provide: NotificationHelper,
          useValue: {
            isOnline: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationDispatcherService>(
      NotificationDispatcherService,
    );
    kafkaService = module.get(KafkaService);
    fcmService = module.get(FcmService);
    notificationHelper = module.get(NotificationHelper);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- setting check ----

  describe('notification preference gate', () => {
    it('returns early when setting is explicitly false', async () => {
      const event = buildEvent({ type: NotificationType.GROUP_INVITE });
      const settingKey =
        NOTIFICATION_SETTING_MAP[NotificationType.GROUP_INVITE]!;
      kafkaService.sendWithTimeout.mockResolvedValue({ [settingKey]: false });

      await service.dispatch(event);

      // PersistInbox should NOT have been emitted
      expect(kafkaClient.emit).not.toHaveBeenCalled();
    });

    it('continues dispatch when setting is true', async () => {
      const event = buildEvent({ type: NotificationType.GROUP_INVITE });
      const settingKey =
        NOTIFICATION_SETTING_MAP[NotificationType.GROUP_INVITE]!;
      kafkaService.sendWithTimeout.mockResolvedValueOnce({
        [settingKey]: true,
      });
      notificationHelper.isOnline.mockResolvedValue(false);
      kafkaService.sendWithTimeout.mockResolvedValueOnce({ tokens: [] });

      await service.dispatch(event);

      expect(kafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.PersistInbox,
        expect.objectContaining({ status: NotificationStatus.PENDING }),
      );
    });

    it('skips setting check for notification types not in the map (SYSTEM)', async () => {
      const event = buildEvent({ type: NotificationType.SYSTEM });
      notificationHelper.isOnline.mockResolvedValue(false);
      kafkaService.sendWithTimeout.mockResolvedValue({ tokens: [] });

      await service.dispatch(event);

      // SettingTopics.Get should NOT have been called
      expect(kafkaService.sendWithTimeout).not.toHaveBeenCalledWith(
        SettingTopics.Get,
        expect.anything(),
      );
    });

    it('continues dispatch when settings fetch throws (swallowed error)', async () => {
      const event = buildEvent({ type: NotificationType.GROUP_INVITE });
      kafkaService.sendWithTimeout.mockRejectedValueOnce(
        new Error('kafka timeout'),
      );
      notificationHelper.isOnline.mockResolvedValue(false);
      kafkaService.sendWithTimeout.mockResolvedValueOnce({ tokens: [] });

      await service.dispatch(event);

      expect(kafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.PersistInbox,
        expect.objectContaining({ status: NotificationStatus.PENDING }),
      );
    });
  });

  // ---- channel defaulting ----

  describe('channel resolution', () => {
    it('defaults to BOTH when preferredChannel is not set', async () => {
      const event = buildEvent({ preferredChannel: undefined as any });
      notificationHelper.isOnline.mockResolvedValue(false);
      kafkaService.sendWithTimeout.mockResolvedValue({ tokens: [] });

      await service.dispatch(event);

      expect(kafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.PersistInbox,
        expect.objectContaining({ channel: NotificationPreferredChannel.BOTH }),
      );
    });
  });

  // ---- persist PENDING ----

  describe('persist PENDING', () => {
    it('always emits PersistInbox with PENDING status before delivery attempt', async () => {
      const event = buildEvent({ type: NotificationType.SYSTEM });
      notificationHelper.isOnline.mockResolvedValue(false);
      kafkaService.sendWithTimeout.mockResolvedValue({ tokens: [] });

      await service.dispatch(event);

      expect(kafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.PersistInbox,
        expect.objectContaining({
          eventId: event.eventId,
          userId: event.userId,
          status: NotificationStatus.PENDING,
          channel: NotificationPreferredChannel.BOTH,
        }),
      );
    });
  });

  // ---- online WebSocket path ----

  describe('WebSocket delivery (online user)', () => {
    it('emits RealtimePush when user is online and channel is WEBSOCKET', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.WEBSOCKET,
      });
      notificationHelper.isOnline.mockResolvedValue(true);

      await service.dispatch(event);

      expect(kafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.RealtimePush,
        expect.objectContaining({ userId: event.userId, event }),
      );
    });

    it('emits RealtimePush when user is online and channel is BOTH', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.BOTH,
      });
      notificationHelper.isOnline.mockResolvedValue(true);
      // Even with BOTH, FCM tokens may be empty
      kafkaService.sendWithTimeout.mockResolvedValue({ tokens: [] });

      await service.dispatch(event);

      expect(kafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.RealtimePush,
        expect.objectContaining({ userId: event.userId }),
      );
    });

    it('does NOT emit RealtimePush when user is offline', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.WEBSOCKET,
      });
      notificationHelper.isOnline.mockResolvedValue(false);

      await service.dispatch(event);

      expect(kafkaClient.emit).not.toHaveBeenCalledWith(
        NotificationTopics.RealtimePush,
        expect.anything(),
      );
    });

    it('does NOT emit RealtimePush when channel is FCM only, even if user is online', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.FCM,
      });
      notificationHelper.isOnline.mockResolvedValue(true);
      kafkaService.sendWithTimeout.mockResolvedValue({ tokens: [] });

      await service.dispatch(event);

      expect(kafkaClient.emit).not.toHaveBeenCalledWith(
        NotificationTopics.RealtimePush,
        expect.anything(),
      );
    });
  });

  // ---- FCM path ----

  describe('FCM delivery', () => {
    it('sends to user FCM topic when user is offline and channel is BOTH', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.BOTH,
      });
      notificationHelper.isOnline.mockResolvedValue(false);
      fcmService.sendToTopic.mockResolvedValue(undefined);

      await service.dispatch(event);

      expect(fcmService.sendToTopic).toHaveBeenCalledWith(
        fcmUserTopic(event.userId),
        { title: event.title, body: event.body, data: undefined },
      );
    });

    it('sends to user FCM topic when channel is FCM only, regardless of online state', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.FCM,
      });
      notificationHelper.isOnline.mockResolvedValue(false);
      fcmService.sendToTopic.mockResolvedValue(undefined);

      await service.dispatch(event);

      expect(fcmService.sendToTopic).toHaveBeenCalledWith(
        fcmUserTopic(event.userId),
        expect.objectContaining({ title: event.title, body: event.body }),
      );
    });

    it('also sends FCM when user is online and channel is BOTH', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.BOTH,
      });
      notificationHelper.isOnline.mockResolvedValue(true);
      fcmService.sendToTopic.mockResolvedValue(undefined);

      await service.dispatch(event);

      expect(fcmService.sendToTopic).toHaveBeenCalled();
    });

    it('coerces non-string data values to strings before sending', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.FCM,
        data: {
          count: 42 as unknown as string,
          flag: true as unknown as string,
        },
      });
      notificationHelper.isOnline.mockResolvedValue(false);
      fcmService.sendToTopic.mockResolvedValue(undefined);

      await service.dispatch(event);

      expect(fcmService.sendToTopic).toHaveBeenCalledWith(
        fcmUserTopic(event.userId),
        expect.objectContaining({ data: { count: '42', flag: 'true' } }),
      );
    });

    it('passes data as undefined when event.data is not set', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.FCM,
        data: undefined,
      });
      notificationHelper.isOnline.mockResolvedValue(false);
      fcmService.sendToTopic.mockResolvedValue(undefined);

      await service.dispatch(event);

      expect(fcmService.sendToTopic).toHaveBeenCalledWith(
        fcmUserTopic(event.userId),
        expect.objectContaining({ data: undefined }),
      );
    });

    it('skips FCM when user is online and channel is WEBSOCKET only', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.WEBSOCKET,
      });
      notificationHelper.isOnline.mockResolvedValue(true);

      await service.dispatch(event);

      expect(fcmService.sendToTopic).not.toHaveBeenCalled();
    });

    it('swallows sendToTopic errors and does not throw', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.FCM,
      });
      notificationHelper.isOnline.mockResolvedValue(false);
      fcmService.sendToTopic.mockRejectedValue(new Error('FCM unavailable'));

      await expect(service.dispatch(event)).resolves.toBeUndefined();
    });

    it('does NOT emit SENT when sendToTopic throws', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.FCM,
      });
      notificationHelper.isOnline.mockResolvedValue(false);
      fcmService.sendToTopic.mockRejectedValue(new Error('FCM unavailable'));

      await service.dispatch(event);

      const sentCalls = kafkaClient.emit.mock.calls.filter(
        (call) =>
          call[0] === NotificationTopics.PersistInbox &&
          call[1]?.status === NotificationStatus.SENT,
      );
      expect(sentCalls).toHaveLength(0);
    });
  });

  // ---- persist SENT ----

  describe('persist SENT', () => {
    it('emits PersistInbox with SENT status after successful delivery', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.BOTH,
      });
      notificationHelper.isOnline.mockResolvedValue(true);
      kafkaService.sendWithTimeout.mockResolvedValue({ tokens: [] });

      await service.dispatch(event);

      expect(kafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.PersistInbox,
        expect.objectContaining({
          status: NotificationStatus.SENT,
          deliveredAt: expect.any(String),
        }),
      );
    });

    it('does NOT emit SENT when no delivery was made', async () => {
      const event = buildEvent({
        preferredChannel: NotificationPreferredChannel.WEBSOCKET,
      });
      notificationHelper.isOnline.mockResolvedValue(false);

      await service.dispatch(event);

      const sentCalls = kafkaClient.emit.mock.calls.filter(
        (call) =>
          call[0] === NotificationTopics.PersistInbox &&
          call[1]?.status === NotificationStatus.SENT,
      );
      expect(sentCalls).toHaveLength(0);
    });
  });
});
