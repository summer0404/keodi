import { Test, TestingModule } from '@nestjs/testing';
import { FriendService } from '../friend.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { FriendTopics } from 'src/shared/constants/topic.constant';
import { PaginationConstants } from 'src/shared/constants/pagination.constants';
import { FriendSortBy, SortOrder } from 'src/shared/enums/sort.enum';

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
};

describe('FriendService', () => {
  let service: FriendService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendService,
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendRequest', () => {
    it('should call FriendTopics.SendRequest with userId and receiverId', async () => {
      const result = { requestId: 'req-1' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.sendRequest('user-1', 'user-2');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.SendRequest,
        { userId: 'user-1', receiverId: 'user-2' },
      );
      expect(response).toEqual(result);
    });

    it('should propagate error from sendRequest', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('already friends'));
      await expect(service.sendRequest('u1', 'u2')).rejects.toThrow('already friends');
    });
  });

  describe('acceptRequest', () => {
    it('should call FriendTopics.AcceptRequest with userId and requestId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'accepted' });

      const result = await service.acceptRequest('user-1', 'req-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.AcceptRequest,
        { userId: 'user-1', requestId: 'req-1' },
      );
    });
  });

  describe('rejectRequest', () => {
    it('should call FriendTopics.RejectRequest with userId and requestId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'rejected' });

      await service.rejectRequest('user-1', 'req-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.RejectRequest,
        { userId: 'user-1', requestId: 'req-1' },
      );
    });
  });

  describe('cancelRequest', () => {
    it('should call FriendTopics.CancelRequest with userId and requestId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'cancelled' });

      await service.cancelRequest('user-1', 'req-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.CancelRequest,
        { userId: 'user-1', requestId: 'req-1' },
      );
    });
  });

  describe('getFriends', () => {
    it('should call FriendTopics.GetFriends with query params and defaults', async () => {
      const query = { page: 2, limit: 20, sortBy: FriendSortBy.CREATED_AT, sortOrder: SortOrder.ASC } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ friends: [] });

      await service.getFriends('user-1', query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.GetFriends,
        {
          userId: 'user-1',
          page: 2,
          limit: 20,
          sortBy: FriendSortBy.CREATED_AT,
          sortOrder: SortOrder.ASC,
        },
      );
    });

    it('should apply defaults when query params are not provided', async () => {
      const query = {} as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ friends: [] });

      await service.getFriends('user-1', query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.GetFriends,
        {
          userId: 'user-1',
          page: PaginationConstants.DEFAULT_PAGE,
          limit: PaginationConstants.DEFAULT_LIMIT,
          sortBy: FriendSortBy.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );
    });

    it('should propagate error from getFriends', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('friends error'));
      await expect(service.getFriends('u1', {} as any)).rejects.toThrow('friends error');
    });
  });

  describe('getPendingRequests', () => {
    it('should call FriendTopics.GetPendingRequests with query params', async () => {
      const query = { page: 1, limit: 10, sortBy: FriendSortBy.CREATED_AT, sortOrder: SortOrder.DESC } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ requests: [] });

      await service.getPendingRequests('user-1', query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.GetPendingRequests,
        {
          userId: 'user-1',
          page: 1,
          limit: 10,
          sortBy: FriendSortBy.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );
    });

    it('should apply defaults when query params are missing', async () => {
      const query = {} as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ requests: [] });

      await service.getPendingRequests('user-1', query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.GetPendingRequests,
        expect.objectContaining({
          page: PaginationConstants.DEFAULT_PAGE,
          limit: PaginationConstants.DEFAULT_LIMIT,
        }),
      );
    });
  });

  describe('removeFriend', () => {
    it('should call FriendTopics.RemoveFriend with userId and friendId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'removed' });

      await service.removeFriend('user-1', 'friend-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FriendTopics.RemoveFriend,
        { userId: 'user-1', friendId: 'friend-1' },
      );
    });
  });
});
