import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { ConversationType } from 'src/shared/enums/chat.enum';
import { ImageService } from 'src/modules/image/image.service';
import { ConversationService } from '../conversation.service';

const makeConversation = (overrides: Record<string, any> = {}) => ({
  id: 'conv-1',
  type: ConversationType.DIRECT,
  name: null,
  avatarUrl: null,
  createdById: 'user-1',
  sessionId: null,
  lastMessageId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  members: [
    {
      id: 'cm-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      joinedAt: new Date(),
      lastReadAt: null,
      user: { id: 'user-1', username: 'user1', firstName: 'U', lastName: '1', pictureUrl: null },
    },
    {
      id: 'cm-2',
      conversationId: 'conv-1',
      userId: 'user-2',
      joinedAt: new Date(),
      lastReadAt: null,
      user: { id: 'user-2', username: 'user2', firstName: 'U', lastName: '2', pictureUrl: null },
    },
  ],
  ...overrides,
});

describe('ConversationService', () => {
  let service: ConversationService;
  let prismaService: {
    conversation: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    conversationMember: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    message: {
      count: jest.Mock;
    };
  };
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    setEx: jest.Mock;
    del: jest.Mock;
    has: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            conversationMember: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            message: {
              count: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            setEx: jest.fn(),
            del: jest.fn(),
            has: jest.fn(),
          },
        },
        {
          provide: ImageService,
          useValue: {
            getImageViewUrl: jest.fn().mockImplementation((url) => Promise.resolve(url)),
          },
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('DIRECT: returns existing conversation if already found', async () => {
      const existing = makeConversation();
      prismaService.conversation.findFirst.mockResolvedValue(existing);

      const result = await service.create({
        type: ConversationType.DIRECT,
        createdById: 'user-1',
        memberIds: ['user-2'],
      });

      expect(prismaService.conversation.findFirst).toHaveBeenCalled();
      expect(prismaService.conversation.create).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('DIRECT: creates new conversation when none found', async () => {
      const newConv = makeConversation();
      prismaService.conversation.findFirst.mockResolvedValue(null);
      prismaService.conversation.create.mockResolvedValue(newConv);

      const result = await service.create({
        type: ConversationType.DIRECT,
        createdById: 'user-1',
        memberIds: ['user-2'],
      });

      expect(prismaService.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: ConversationType.DIRECT }),
        }),
      );
      expect(result).toBe(newConv);
    });

    it('DIRECT: throws RpcException when member count is not 2', async () => {
      await expect(
        service.create({
          type: ConversationType.DIRECT,
          createdById: 'user-1',
          memberIds: ['user-2', 'user-3'],
        }),
      ).rejects.toThrow(RpcException);
    });

    it('GROUP with sessionId: returns existing conversation if sessionId matches', async () => {
      const existing = makeConversation({
        type: ConversationType.GROUP,
        sessionId: 'sess-1',
      });
      prismaService.conversation.findFirst.mockResolvedValue(existing);

      const result = await service.create({
        type: ConversationType.GROUP,
        createdById: 'user-1',
        memberIds: ['user-2'],
        sessionId: 'sess-1',
      });

      expect(prismaService.conversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sessionId: 'sess-1' } }),
      );
      expect(prismaService.conversation.create).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('GROUP: creates new conversation when no sessionId match', async () => {
      const newConv = makeConversation({ type: ConversationType.GROUP });
      prismaService.conversation.findFirst.mockResolvedValue(null);
      prismaService.conversation.create.mockResolvedValue(newConv);

      const result = await service.create({
        type: ConversationType.GROUP,
        createdById: 'user-1',
        memberIds: ['user-2', 'user-3'],
        name: 'My Group',
      });

      expect(prismaService.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: ConversationType.GROUP }),
        }),
      );
      expect(result).toBe(newConv);
    });
  });

  describe('getById', () => {
    it('returns conversation when user is a member', async () => {
      const conv = makeConversation();
      prismaService.conversation.findFirst.mockResolvedValue(conv);

      const result = await service.getById({
        conversationId: 'conv-1',
        userId: 'user-1',
      });

      expect(prismaService.conversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'conv-1',
            members: { some: { userId: 'user-1' } },
          }),
        }),
      );
      expect(result).toEqual(conv);
    });

    it('throws CONVERSATION_NOT_FOUND when user is not a member', async () => {
      prismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.getById({ conversationId: 'conv-x', userId: 'user-1' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('list', () => {
    it('returns conversations with unreadCount for each', async () => {
      const conv = makeConversation({
        members: [{ userId: 'user-1', lastReadAt: null, user: { id: 'user-1', username: 'user1', firstName: 'U', lastName: '1', pictureUrl: null } }],
      });
      prismaService.conversation.findMany.mockResolvedValue([conv]);
      prismaService.message.count.mockResolvedValue(3);

      const result = await service.list({ userId: 'user-1' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].unreadCount).toBe(3);
      expect(result.nextCursor).toBeNull();
    });

    it('sets nextCursor when there are more items than limit', async () => {
      const conversations = Array.from({ length: 21 }, (_, i) =>
        makeConversation({
          id: `conv-${i}`,
          members: [{ userId: 'user-1', lastReadAt: null, user: { id: 'user-1', username: 'user1', firstName: 'U', lastName: '1', pictureUrl: null } }],
        }),
      );
      prismaService.conversation.findMany.mockResolvedValue(conversations);
      prismaService.message.count.mockResolvedValue(0);

      const result = await service.list({ userId: 'user-1', limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('conv-19');
    });
  });

  describe('update', () => {
    it('updates name and avatarUrl and invalidates Redis cache', async () => {
      const updatedConv = makeConversation({ name: 'New Name' });
      prismaService.conversationMember.findUnique.mockResolvedValue({
        id: 'cm-1',
      });
      prismaService.conversation.update.mockResolvedValue(updatedConv);

      const result = await service.update({
        conversationId: 'conv-1',
        userId: 'user-1',
        name: 'New Name',
      });

      expect(prismaService.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
      expect(redisService.del).toHaveBeenCalledWith(
        expect.stringContaining('conv-1'),
      );
      expect(result).toBe(updatedConv);
    });

    it('throws NOT_A_MEMBER when user is not in conversation', async () => {
      prismaService.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.update({
          conversationId: 'conv-1',
          userId: 'user-x',
          name: 'Test',
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('getMembers', () => {
    it('returns cached member IDs from Redis without hitting DB', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(['user-1', 'user-2']));

      const result = await service.getMembers('conv-1');

      expect(redisService.get).toHaveBeenCalled();
      expect(prismaService.conversationMember.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('fetches from DB on cache miss and caches result', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.conversationMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      redisService.setEx.mockResolvedValue(undefined);

      const result = await service.getMembers('conv-1');

      expect(prismaService.conversationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { conversationId: 'conv-1' } }),
      );
      expect(redisService.setEx).toHaveBeenCalledWith(
        expect.stringContaining('conv-1'),
        JSON.stringify(['user-1', 'user-2']),
        600,
      );
      expect(result).toEqual(['user-1', 'user-2']);
    });
  });
});
