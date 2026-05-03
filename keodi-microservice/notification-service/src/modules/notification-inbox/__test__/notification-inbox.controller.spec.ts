import { Test, TestingModule } from '@nestjs/testing';
import { NotificationInboxController } from '../notification-inbox.controller';
import { NotificationInboxService } from '../notification-inbox.service';
import {
  NotificationPreferredChannel,
  NotificationStatus,
} from 'src/shared/enums/notification.enum';

const buildInboxResult = (overrides: Record<string, any> = {}) => ({
  notifications: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  unreadCount: 0,
  ...overrides,
});

describe('NotificationInboxController', () => {
  let controller: NotificationInboxController;
  let inboxService: jest.Mocked<NotificationInboxService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationInboxController],
      providers: [
        {
          provide: NotificationInboxService,
          useValue: {
            upsertByEventId: jest.fn(),
            getByUserId: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            getUnreadCount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationInboxController>(NotificationInboxController);
    inboxService = module.get(NotificationInboxService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- persist ----

  describe('persist', () => {
    it('delegates payload to inboxService.upsertByEventId', async () => {
      const payload = {
        eventId: 'evt-1',
        userId: 'user-1',
        type: 'SYSTEM',
        title: 'T',
        body: 'B',
        channel: NotificationPreferredChannel.BOTH,
        status: NotificationStatus.PENDING,
      };
      inboxService.upsertByEventId.mockResolvedValue({ id: 'notif-1' } as any);

      const result = await controller.persist(payload);

      expect(inboxService.upsertByEventId).toHaveBeenCalledWith(payload);
      expect(result).toEqual({ id: 'notif-1' });
    });

    it('propagates service errors', async () => {
      inboxService.upsertByEventId.mockRejectedValue(new Error('db error'));

      await expect(controller.persist({ eventId: 'x' })).rejects.toThrow('db error');
    });
  });

  // ---- getInbox ----

  describe('getInbox', () => {
    it('delegates to inboxService.getByUserId and returns result', async () => {
      const expected = buildInboxResult({ total: 5 });
      inboxService.getByUserId.mockResolvedValue(expected);

      const payload = { userId: 'user-1', page: 1, limit: 10 };
      const result = await controller.getInbox(payload);

      expect(inboxService.getByUserId).toHaveBeenCalledWith(payload);
      expect(result).toBe(expected);
    });

    it('passes unreadOnly flag to service', async () => {
      const expected = buildInboxResult();
      inboxService.getByUserId.mockResolvedValue(expected);

      const payload = { userId: 'user-1', page: 1, limit: 10, unreadOnly: true };
      await controller.getInbox(payload);

      expect(inboxService.getByUserId).toHaveBeenCalledWith(
        expect.objectContaining({ unreadOnly: true }),
      );
    });

    it('propagates service errors', async () => {
      inboxService.getByUserId.mockRejectedValue(new Error('query error'));

      await expect(
        controller.getInbox({ userId: 'u', page: 1, limit: 10 }),
      ).rejects.toThrow('query error');
    });
  });

  // ---- markAsRead ----

  describe('markAsRead', () => {
    it('delegates to inboxService.markAsRead with userId and notificationId', async () => {
      inboxService.markAsRead.mockResolvedValue({ count: 1 } as any);

      const payload = { userId: 'user-1', notificationId: 'notif-1' };
      const result = await controller.markAsRead(payload);

      expect(inboxService.markAsRead).toHaveBeenCalledWith(payload);
      expect(result).toEqual({ count: 1 });
    });

    it('propagates service errors', async () => {
      inboxService.markAsRead.mockRejectedValue(new Error('update error'));

      await expect(
        controller.markAsRead({ userId: 'u', notificationId: 'n' }),
      ).rejects.toThrow('update error');
    });
  });

  // ---- markAllAsRead ----

  describe('markAllAsRead', () => {
    it('delegates to inboxService.markAllAsRead', async () => {
      inboxService.markAllAsRead.mockResolvedValue({ count: 5 } as any);

      const result = await controller.markAllAsRead({ userId: 'user-1' });

      expect(inboxService.markAllAsRead).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toEqual({ count: 5 });
    });
  });

  // ---- getUnreadCount ----

  describe('getUnreadCount', () => {
    it('delegates to inboxService.getUnreadCount and returns count', async () => {
      inboxService.getUnreadCount.mockResolvedValue({ count: 3 });

      const result = await controller.getUnreadCount({ userId: 'user-1' });

      expect(inboxService.getUnreadCount).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toEqual({ count: 3 });
    });

    it('returns zero count when no unread', async () => {
      inboxService.getUnreadCount.mockResolvedValue({ count: 0 });

      const result = await controller.getUnreadCount({ userId: 'user-2' });

      expect(result).toEqual({ count: 0 });
    });

    it('propagates service errors', async () => {
      inboxService.getUnreadCount.mockRejectedValue(new Error('count error'));

      await expect(controller.getUnreadCount({ userId: 'u' })).rejects.toThrow('count error');
    });
  });
});
