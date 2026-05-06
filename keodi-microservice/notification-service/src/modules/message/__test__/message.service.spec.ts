import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { MessageService } from '../message.service';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { ConversationService } from 'src/modules/conversation/conversation.service';
import { MessageType } from 'src/shared/enums/chat.enum';

const makeMessage = (overrides: Record<string, any> = {}) => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  content: 'Hello',
  type: MessageType.TEXT,
  replyToId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('MessageService', () => {
  let service: MessageService;
  let prismaService: {
    message: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    conversation: {
      update: jest.Mock;
    };
    conversationMember: {
      updateMany: jest.Mock;
    };
  };
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    setEx: jest.Mock;
    del: jest.Mock;
    has: jest.Mock;
  };
  let kafkaService: {
    getClient: jest.Mock;
    sendWithTimeout: jest.Mock;
  };
  let fcmService: {
    sendMulticast: jest.Mock;
  };
  let conversationService: {
    getMembers: jest.Mock;
  };

  const mockEmit = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: PrismaService,
          useValue: {
            message: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            conversation: {
              update: jest.fn(),
            },
            conversationMember: {
              updateMany: jest.fn(),
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
          provide: KafkaService,
          useValue: {
            getClient: jest.fn().mockReturnValue({ emit: mockEmit }),
            sendWithTimeout: jest.fn(),
          },
        },
        {
          provide: FcmService,
          useValue: {
            sendMulticast: jest.fn(),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            getMembers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    kafkaService = module.get(KafkaService);
    fcmService = module.get(FcmService);
    conversationService = module.get(ConversationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── send ──────────────────────────────────────────────────────────────────

  describe('send', () => {
    it('persists message, updates conversation, invalidates cache, and emits realtime push', async () => {
      const msg = makeMessage();
      conversationService.getMembers.mockResolvedValue(['user-1', 'user-2']);
      prismaService.message.create.mockResolvedValue(msg);
      prismaService.conversation.update.mockResolvedValue({});
      redisService.del.mockResolvedValue(undefined);
      redisService.has.mockResolvedValue(true);

      const result = await service.send({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello',
      });

      expect(prismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ conversationId: 'conv-1', senderId: 'user-1', content: 'Hello' }),
        }),
      );
      expect(prismaService.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'conv-1' }, data: expect.objectContaining({ lastMessageId: msg.id }) }),
      );
      expect(redisService.del).toHaveBeenCalledWith(expect.stringContaining('conv-1'));
      expect(mockEmit).toHaveBeenCalledWith('chat.realtime.push', expect.objectContaining({ event: 'message.new' }));
      expect(result).toBe(msg);
    });

    it('throws NOT_A_MEMBER when senderId is not in conversation', async () => {
      conversationService.getMembers.mockResolvedValue(['user-2', 'user-3']);

      await expect(
        service.send({ conversationId: 'conv-1', senderId: 'user-x', content: 'Hi' }),
      ).rejects.toThrow(RpcException);

      expect(prismaService.message.create).not.toHaveBeenCalled();
    });

    it('sends FCM for offline members and skips online members', async () => {
      const msg = makeMessage();
      conversationService.getMembers.mockResolvedValue(['user-1', 'user-2', 'user-3']);
      prismaService.message.create.mockResolvedValue(msg);
      prismaService.conversation.update.mockResolvedValue({});
      redisService.del.mockResolvedValue(undefined);
      // user-2 is online, user-3 is offline
      redisService.has.mockImplementation((key: string) => {
        if (key.includes('user-2')) return Promise.resolve(true);
        if (key.includes('user-3')) return Promise.resolve(false);
        return Promise.resolve(false);
      });
      kafkaService.sendWithTimeout.mockResolvedValue({ tokens: ['token-abc'] });
      fcmService.sendMulticast.mockResolvedValue([]);

      await service.send({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello all',
      });

      // FCM only called once for user-3 (offline), not for user-2 (online)
      expect(fcmService.sendMulticast).toHaveBeenCalledTimes(1);
      expect(fcmService.sendMulticast).toHaveBeenCalledWith(
        ['token-abc'],
        expect.objectContaining({ title: 'New message' }),
      );
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns cached messages on first page (no cursor) hit', async () => {
      const cachedMessages = [makeMessage()];
      conversationService.getMembers.mockResolvedValue(['user-1', 'user-2']);
      redisService.get.mockResolvedValue(JSON.stringify(cachedMessages));

      const result = await service.list({ conversationId: 'conv-1', userId: 'user-1' });

      expect(redisService.get).toHaveBeenCalled();
      expect(prismaService.message.findMany).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('queries DB on cache miss and caches the result', async () => {
      const messages = [makeMessage()];
      conversationService.getMembers.mockResolvedValue(['user-1', 'user-2']);
      redisService.get.mockResolvedValue(null);
      prismaService.message.findMany.mockResolvedValue(messages);
      redisService.setEx.mockResolvedValue(undefined);

      const result = await service.list({ conversationId: 'conv-1', userId: 'user-1' });

      expect(prismaService.message.findMany).toHaveBeenCalled();
      expect(redisService.setEx).toHaveBeenCalledWith(
        expect.stringContaining('conv-1'),
        JSON.stringify(messages),
        3600,
      );
      expect(result.items).toHaveLength(1);
    });

    it('queries DB directly when cursor is provided (skips cache)', async () => {
      const messages = [makeMessage()];
      conversationService.getMembers.mockResolvedValue(['user-1', 'user-2']);
      prismaService.message.findMany.mockResolvedValue(messages);

      const result = await service.list({ conversationId: 'conv-1', userId: 'user-1', cursor: 'msg-0' });

      expect(redisService.get).not.toHaveBeenCalled();
      expect(prismaService.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'msg-0' }, skip: 1 }),
      );
      expect(result.items).toHaveLength(1);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes the message, invalidates cache, and emits message.deleted realtime push', async () => {
      const msg = makeMessage();
      prismaService.message.findFirst.mockResolvedValue(msg);
      prismaService.message.update.mockResolvedValue({ ...msg, deletedAt: new Date() });
      redisService.del.mockResolvedValue(undefined);

      const result = await service.delete({ messageId: 'msg-1', userId: 'user-1' });

      expect(prismaService.message.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'msg-1' }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
      expect(redisService.del).toHaveBeenCalledWith(expect.stringContaining('conv-1'));
      expect(mockEmit).toHaveBeenCalledWith(
        'chat.realtime.push',
        expect.objectContaining({ event: 'message.deleted', payload: { messageId: 'msg-1' } }),
      );
      expect(result).toEqual({ success: true });
    });

    it('throws MESSAGE_NOT_FOUND when user is not the sender or message is already deleted', async () => {
      prismaService.message.findFirst.mockResolvedValue(null);

      await expect(
        service.delete({ messageId: 'msg-x', userId: 'user-other' }),
      ).rejects.toThrow(RpcException);

      expect(prismaService.message.update).not.toHaveBeenCalled();
    });
  });

  // ── markRead ──────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('updates lastReadAt for the member in the conversation', async () => {
      prismaService.conversationMember.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markRead({ conversationId: 'conv-1', userId: 'user-1' });

      expect(prismaService.conversationMember.updateMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1', userId: 'user-1' },
        data: expect.objectContaining({ lastReadAt: expect.any(Date) }),
      });
      expect(result).toEqual({ success: true });
    });
  });
});
