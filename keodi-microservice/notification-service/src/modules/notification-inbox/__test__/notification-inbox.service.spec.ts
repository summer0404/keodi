import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { NotificationInboxService } from '../notification-inbox.service';
import { PrismaService } from 'src/database/prisma.service';
import {
  NotificationPreferredChannel,
  NotificationStatus,
  NotificationType,
} from 'src/shared/enums/notification.enum';

const makeNotification = (overrides: Record<string, any> = {}) => ({
  id: 'notif-1',
  type: NotificationType.SYSTEM,
  title: 'Hello',
  body: 'World',
  data: null,
  deepLink: null,
  channel: NotificationPreferredChannel.BOTH,
  status: NotificationStatus.SENT,
  isRead: false,
  deliveredAt: null,
  readAt: null,
  createdAt: new Date(),
  ...overrides,
});

describe('NotificationInboxService', () => {
  let service: NotificationInboxService;
  let prismaService: {
    notification: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationInboxService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              upsert: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              updateMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationInboxService>(NotificationInboxService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- upsertByEventId ----

  describe('upsertByEventId', () => {
    it('calls prisma.upsert with correct create and update payloads', async () => {
      const payload = {
        eventId: 'evt-1',
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Title',
        body: 'Body',
        data: { key: 'val' },
        deepLink: '/home',
        channel: NotificationPreferredChannel.BOTH,
        status: NotificationStatus.PENDING,
        deliveredAt: null,
      };
      const mockResult = makeNotification();
      prismaService.notification.upsert.mockResolvedValue(mockResult);

      const result = await service.upsertByEventId(payload);

      expect(prismaService.notification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'evt-1' },
          create: expect.objectContaining({
            eventId: 'evt-1',
            userId: 'user-1',
            status: NotificationStatus.PENDING,
          }),
          update: expect.objectContaining({
            status: NotificationStatus.PENDING,
          }),
        }),
      );
      expect(result).toBe(mockResult);
    });

    it('converts deliveredAt string to a Date in the create payload', async () => {
      const deliveredAt = '2026-01-01T00:00:00.000Z';
      const payload = {
        eventId: 'evt-2',
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'T',
        body: 'B',
        data: null,
        deepLink: null,
        channel: NotificationPreferredChannel.FCM,
        status: NotificationStatus.SENT,
        deliveredAt,
      };
      prismaService.notification.upsert.mockResolvedValue(makeNotification());

      await service.upsertByEventId(payload);

      const call = prismaService.notification.upsert.mock.calls[0][0];
      expect(call.create.deliveredAt).toEqual(new Date(deliveredAt));
      expect(call.update.deliveredAt).toEqual(new Date(deliveredAt));
    });

    it('stores Prisma.JsonNull when data is null/undefined', async () => {
      const payload = {
        eventId: 'evt-3',
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'T',
        body: 'B',
        data: null,
        channel: NotificationPreferredChannel.BOTH,
        status: NotificationStatus.PENDING,
        deliveredAt: null,
      };
      prismaService.notification.upsert.mockResolvedValue(makeNotification());

      await service.upsertByEventId(payload);

      const call = prismaService.notification.upsert.mock.calls[0][0];
      expect(call.create.data).toBe(Prisma.JsonNull);
    });

    it('propagates Prisma errors', async () => {
      prismaService.notification.upsert.mockRejectedValue(new Error('db error'));

      await expect(service.upsertByEventId({ eventId: 'x', userId: 'u' } as any)).rejects.toThrow('db error');
    });
  });

  // ---- getByUserId ----

  describe('getByUserId', () => {
    it('returns paginated results with correct structure', async () => {
      const notifications = [makeNotification()];
      prismaService.$transaction.mockResolvedValue([notifications, 1, 1]);

      const result = await service.getByUserId({
        userId: 'user-1',
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        notifications,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        unreadCount: 1,
      });
    });

    it('calculates skip as (page - 1) * limit', async () => {
      prismaService.$transaction.mockImplementation(async (queries) => {
        await Promise.all(queries);
        return [[], 0, 0];
      });
      prismaService.notification.findMany.mockResolvedValue([]);
      prismaService.notification.count.mockResolvedValue(0);

      await service.getByUserId({ userId: 'user-1', page: 3, limit: 10 });

      const findManyCall = prismaService.notification.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(20);
      expect(findManyCall.take).toBe(10);
    });

    it('adds isRead: false filter when unreadOnly is true', async () => {
      prismaService.$transaction.mockImplementation(async (queries) => {
        await Promise.all(queries);
        return [[], 0, 0];
      });
      prismaService.notification.findMany.mockResolvedValue([]);
      prismaService.notification.count.mockResolvedValue(0);

      await service.getByUserId({ userId: 'user-1', page: 1, limit: 10, unreadOnly: true });

      const findManyCall = prismaService.notification.findMany.mock.calls[0][0];
      expect(findManyCall.where).toMatchObject({ isRead: false });
    });

    it('does not add isRead filter when unreadOnly is false', async () => {
      prismaService.$transaction.mockImplementation(async (queries) => {
        await Promise.all(queries);
        return [[], 0, 0];
      });
      prismaService.notification.findMany.mockResolvedValue([]);
      prismaService.notification.count.mockResolvedValue(0);

      await service.getByUserId({ userId: 'user-1', page: 1, limit: 10, unreadOnly: false });

      const findManyCall = prismaService.notification.findMany.mock.calls[0][0];
      expect(findManyCall.where).not.toHaveProperty('isRead');
    });

    it('computes totalPages correctly with rounding up', async () => {
      prismaService.$transaction.mockResolvedValue([[], 25, 5]);

      const result = await service.getByUserId({ userId: 'user-1', page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });
  });

  // ---- markAsRead ----

  describe('markAsRead', () => {
    it('calls updateMany with notificationId and userId filter', async () => {
      prismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsRead({
        userId: 'user-1',
        notificationId: 'notif-1',
      });

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: expect.objectContaining({ isRead: true, readAt: expect.any(Date) }),
      });
      expect(result).toEqual({ count: 1 });
    });

    it('propagates Prisma errors', async () => {
      prismaService.notification.updateMany.mockRejectedValue(new Error('update error'));

      await expect(
        service.markAsRead({ userId: 'u', notificationId: 'n' }),
      ).rejects.toThrow('update error');
    });
  });

  // ---- markAllAsRead ----

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for the given user', async () => {
      prismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead({ userId: 'user-1' });

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: expect.objectContaining({ isRead: true, readAt: expect.any(Date) }),
      });
      expect(result).toEqual({ count: 5 });
    });
  });

  // ---- getUnreadCount ----

  describe('getUnreadCount', () => {
    it('returns the count of unread notifications', async () => {
      prismaService.notification.count.mockResolvedValue(7);

      const result = await service.getUnreadCount({ userId: 'user-1' });

      expect(prismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(result).toEqual({ count: 7 });
    });

    it('returns zero when no unread notifications', async () => {
      prismaService.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount({ userId: 'user-2' });

      expect(result).toEqual({ count: 0 });
    });
  });
});
