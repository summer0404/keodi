import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { FriendService } from '../friend.service';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ImageService } from 'src/modules/image/image.service';
import { ConversationService } from 'src/modules/conversation/conversation.service';
import { FriendRequestStatus } from '@prisma/client';
import { FriendSortBy, SortOrder } from 'src/shared/enums/sort.enum';

const mockPrismaService = {
  user: { findUnique: jest.fn() },
  friendship: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  friendRequest: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockKafkaClient = { emit: jest.fn() };
const mockKafkaService = {
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

const mockImageService = {
  getImageViewUrl: jest.fn().mockResolvedValue('https://cdn.example.com/pic.jpg'),
};

const mockConversationService = {
  create: jest.fn(),
};

describe('FriendService', () => {
  let service: FriendService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: ImageService, useValue: mockImageService },
        { provide: ConversationService, useValue: mockConversationService },
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // sendRequest
  // ──────────────────────────────────────────────
  describe('sendRequest', () => {
    it('throws BAD_REQUEST when sender === receiver', async () => {
      await expect(service.sendRequest('u1', 'u1')).rejects.toThrow(RpcException);
    });

    it('throws NOT_FOUND when receiver does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.sendRequest('u1', 'u2')).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when already friends', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u2' });
      mockPrismaService.friendship.findUnique.mockResolvedValue({ userId: 'u1', friendId: 'u2' });

      await expect(service.sendRequest('u1', 'u2')).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when pending request already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u2' });
      mockPrismaService.friendship.findUnique.mockResolvedValue(null);
      mockPrismaService.friendRequest.findFirst.mockResolvedValue({ id: 'req-1' });

      await expect(service.sendRequest('u1', 'u2')).rejects.toThrow(RpcException);
    });

    it('creates friend request and emits notification on happy path', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'u2' })              // receiver
        .mockResolvedValueOnce({ firstName: 'John', lastName: 'Doe' }); // sender info
      mockPrismaService.friendship.findUnique.mockResolvedValue(null);
      mockPrismaService.friendRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.friendRequest.deleteMany.mockResolvedValue({});
      mockPrismaService.friendRequest.create.mockResolvedValue({ id: 'req-1' });

      const result = await service.sendRequest('u1', 'u2');

      expect(mockPrismaService.friendRequest.create).toHaveBeenCalled();
      expect(mockKafkaClient.emit).toHaveBeenCalled();
      expect((result as any).id).toBe('req-1');
    });
  });

  // ──────────────────────────────────────────────
  // acceptRequest
  // ──────────────────────────────────────────────
  describe('acceptRequest', () => {
    it('throws NOT_FOUND when request does not exist', async () => {
      mockPrismaService.friendRequest.findUnique.mockResolvedValue(null);

      await expect(service.acceptRequest('u1', 'req-1')).rejects.toThrow(RpcException);
    });

    it('throws FORBIDDEN when user is not the receiver', async () => {
      mockPrismaService.friendRequest.findUnique.mockResolvedValue({ id: 'req-1', receiverId: 'u2', status: FriendRequestStatus.PENDING });

      await expect(service.acceptRequest('u1', 'req-1')).rejects.toThrow(RpcException);
    });

    it('throws BAD_REQUEST when request is no longer PENDING', async () => {
      mockPrismaService.friendRequest.findUnique.mockResolvedValue({ id: 'req-1', receiverId: 'u1', status: FriendRequestStatus.ACCEPTED });

      await expect(service.acceptRequest('u1', 'req-1')).rejects.toThrow(RpcException);
    });

    it('creates friendship and emits notification on happy path', async () => {
      const request = { id: 'req-1', receiverId: 'u1', senderId: 'u2', status: FriendRequestStatus.PENDING };
      mockPrismaService.friendRequest.findUnique.mockResolvedValue(request);
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          friendRequest: { update: jest.fn().mockResolvedValue({}) },
          friendship: { createMany: jest.fn().mockResolvedValue({}) },
          user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Jane', lastName: 'Doe' }) },
        };
        return fn(tx);
      });

      const result = await service.acceptRequest('u1', 'req-1') as any;

      expect(result.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // rejectRequest
  // ──────────────────────────────────────────────
  describe('rejectRequest', () => {
    it('throws NOT_FOUND when request does not exist', async () => {
      mockPrismaService.friendRequest.findUnique.mockResolvedValue(null);

      await expect(service.rejectRequest('u1', 'req-1')).rejects.toThrow(RpcException);
    });

    it('throws FORBIDDEN when user is not the receiver', async () => {
      mockPrismaService.friendRequest.findUnique.mockResolvedValue({ id: 'req-1', receiverId: 'u2', status: FriendRequestStatus.PENDING });

      await expect(service.rejectRequest('u1', 'req-1')).rejects.toThrow(RpcException);
    });

    it('rejects request on happy path', async () => {
      const request = { id: 'req-1', receiverId: 'u1', status: FriendRequestStatus.PENDING };
      mockPrismaService.friendRequest.findUnique.mockResolvedValue(request);
      mockPrismaService.friendRequest.update.mockResolvedValue({});

      const result = await service.rejectRequest('u1', 'req-1') as any;

      expect(mockPrismaService.friendRequest.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // removeFriend
  // ──────────────────────────────────────────────
  describe('removeFriend', () => {
    it('throws NOT_FOUND when friendship does not exist', async () => {
      mockPrismaService.friendship.findUnique.mockResolvedValue(null);

      await expect(service.removeFriend('u1', 'u2')).rejects.toThrow(RpcException);
    });

    it('removes both friendship records on happy path', async () => {
      mockPrismaService.friendship.findUnique.mockResolvedValue({ userId: 'u1', friendId: 'u2' });
      mockPrismaService.friendship.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.removeFriend('u1', 'u2') as any;

      expect(mockPrismaService.friendship.deleteMany).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // cancelRequest
  // ──────────────────────────────────────────────
  describe('cancelRequest', () => {
    it('throws NOT_FOUND when request does not exist', async () => {
      mockPrismaService.friendRequest.findUnique.mockResolvedValue(null);

      await expect(service.cancelRequest('u1', 'req-1')).rejects.toThrow(RpcException);
    });

    it('throws FORBIDDEN when user is not the sender', async () => {
      mockPrismaService.friendRequest.findUnique.mockResolvedValue({ id: 'req-1', senderId: 'u2', status: FriendRequestStatus.PENDING });

      await expect(service.cancelRequest('u1', 'req-1')).rejects.toThrow(RpcException);
    });

    it('deletes request on happy path', async () => {
      mockPrismaService.friendRequest.findUnique.mockResolvedValue({ id: 'req-1', senderId: 'u1', status: FriendRequestStatus.PENDING });
      mockPrismaService.friendRequest.delete.mockResolvedValue({});

      const result = await service.cancelRequest('u1', 'req-1') as any;

      expect(mockPrismaService.friendRequest.delete).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // getFriends
  // ──────────────────────────────────────────────
  describe('getFriends', () => {
    it('returns paginated friend list', async () => {
      const friendship = { friend: { id: 'u2', pictureUrl: null } };
      mockPrismaService.friendship.findMany.mockResolvedValue([friendship]);
      mockPrismaService.friendship.count.mockResolvedValue(1);

      const result = await service.getFriends({ userId: 'u1', page: 1, limit: 10, sortBy: FriendSortBy.NAME, sortOrder: SortOrder.ASC } as any) as any;

      expect(result.friends).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
