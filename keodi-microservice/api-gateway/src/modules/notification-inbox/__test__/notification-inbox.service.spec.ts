import { Test, TestingModule } from '@nestjs/testing';
import { NotificationInboxService } from '../notification-inbox.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { NotificationInboxTopics } from 'src/shared/constants/topic.constant';

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
};

describe('NotificationInboxService', () => {
  let service: NotificationInboxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationInboxService,
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<NotificationInboxService>(NotificationInboxService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInbox', () => {
    it('should call NotificationInboxTopics.GetInbox with userId and query params', async () => {
      const userId = 'user-1';
      const query = { page: 1, limit: 10, unreadOnly: false } as any;
      const result = { notifications: [], total: 0 };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getInbox(userId, query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        NotificationInboxTopics.GetInbox,
        { userId, page: 1, limit: 10, unreadOnly: false },
      );
      expect(response).toEqual(result);
    });

    it('should pass unreadOnly=true when specified', async () => {
      const query = { page: 1, limit: 5, unreadOnly: true } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ notifications: [] });

      await service.getInbox('user-1', query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        NotificationInboxTopics.GetInbox,
        expect.objectContaining({ unreadOnly: true }),
      );
    });

    it('should propagate error from getInbox', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('inbox error'));
      await expect(service.getInbox('u1', {} as any)).rejects.toThrow('inbox error');
    });
  });

  describe('markAsRead', () => {
    it('should call NotificationInboxTopics.MarkAsRead with userId and notificationId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'marked as read' });

      const result = await service.markAsRead('user-1', 'notif-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        NotificationInboxTopics.MarkAsRead,
        { userId: 'user-1', notificationId: 'notif-1' },
      );
      expect(result).toEqual({ message: 'marked as read' });
    });

    it('should propagate error from markAsRead', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('mark error'));
      await expect(service.markAsRead('u1', 'n1')).rejects.toThrow('mark error');
    });
  });

  describe('markAllAsRead', () => {
    it('should call NotificationInboxTopics.MarkAllAsRead with userId only', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'all marked as read' });

      const result = await service.markAllAsRead('user-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        NotificationInboxTopics.MarkAllAsRead,
        { userId: 'user-1' },
      );
      expect(result).toEqual({ message: 'all marked as read' });
    });
  });

  describe('getUnreadCount', () => {
    it('should call NotificationInboxTopics.GetUnreadCount with userId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ count: 5 });

      const result = await service.getUnreadCount('user-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        NotificationInboxTopics.GetUnreadCount,
        { userId: 'user-1' },
      );
      expect(result).toEqual({ count: 5 });
    });

    it('should return count 0 when no unread notifications', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ count: 0 });

      const result = await service.getUnreadCount('user-empty');

      expect(result).toEqual({ count: 0 });
    });

    it('should propagate error from getUnreadCount', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('count error'));
      await expect(service.getUnreadCount('u1')).rejects.toThrow('count error');
    });
  });
});
