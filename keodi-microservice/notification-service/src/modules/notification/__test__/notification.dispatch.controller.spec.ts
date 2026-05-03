import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDispatchController } from '../notification.dispatch.controller';
import { NotificationDispatcherService } from '../notification.dispatcher.service';
import { DispatchNotificationEvent } from 'src/shared/interfaces/notification.interface';
import {
  NotificationPreferredChannel,
  NotificationType,
} from 'src/shared/enums/notification.enum';

const buildEvent = (overrides: Partial<DispatchNotificationEvent> = {}): DispatchNotificationEvent => ({
  eventId: 'evt-1',
  userId: 'user-1',
  type: NotificationType.SYSTEM,
  title: 'Test title',
  body: 'Test body',
  preferredChannel: NotificationPreferredChannel.BOTH,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('NotificationDispatchController', () => {
  let controller: NotificationDispatchController;
  let dispatcherService: jest.Mocked<NotificationDispatcherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationDispatchController],
      providers: [
        {
          provide: NotificationDispatcherService,
          useValue: {
            dispatch: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationDispatchController>(NotificationDispatchController);
    dispatcherService = module.get(NotificationDispatcherService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('dispatch', () => {
    it('forwards the payload to the dispatcher service', async () => {
      const event = buildEvent();
      dispatcherService.dispatch.mockResolvedValue(undefined);

      await controller.dispatch(event);

      expect(dispatcherService.dispatch).toHaveBeenCalledWith(event);
      expect(dispatcherService.dispatch).toHaveBeenCalledTimes(1);
    });

    it('awaits the dispatcher and does not swallow its errors', async () => {
      const event = buildEvent();
      dispatcherService.dispatch.mockRejectedValue(new Error('dispatch failed'));

      await expect(controller.dispatch(event)).rejects.toThrow('dispatch failed');
    });

    it('passes a WEBSOCKET-channel event unmodified', async () => {
      const event = buildEvent({ preferredChannel: NotificationPreferredChannel.WEBSOCKET });
      dispatcherService.dispatch.mockResolvedValue(undefined);

      await controller.dispatch(event);

      expect(dispatcherService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ preferredChannel: NotificationPreferredChannel.WEBSOCKET }),
      );
    });

    it('passes a FCM-channel event unmodified', async () => {
      const event = buildEvent({ preferredChannel: NotificationPreferredChannel.FCM });
      dispatcherService.dispatch.mockResolvedValue(undefined);

      await controller.dispatch(event);

      expect(dispatcherService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ preferredChannel: NotificationPreferredChannel.FCM }),
      );
    });

    it('passes optional deepLink and data fields through', async () => {
      const event = buildEvent({
        deepLink: '/some/deep/link',
        data: { key: 'value' },
      });
      dispatcherService.dispatch.mockResolvedValue(undefined);

      await controller.dispatch(event);

      expect(dispatcherService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ deepLink: '/some/deep/link', data: { key: 'value' } }),
      );
    });
  });
});
