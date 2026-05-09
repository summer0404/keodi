import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { MemberService } from '../member.service';

describe('MemberService', () => {
  let service: MemberService;
  let prismaService: {
    conversationMember: {
      findUnique: jest.Mock;
      createMany: jest.Mock;
      delete: jest.Mock;
    };
    conversation: {
      findFirst: jest.Mock;
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
        MemberService,
        {
          provide: PrismaService,
          useValue: {
            conversationMember: {
              findUnique: jest.fn(),
              createMany: jest.fn(),
              delete: jest.fn(),
            },
            conversation: {
              findFirst: jest.fn(),
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
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('add', () => {
    it('adds new members and invalidates Redis cache', async () => {
      prismaService.conversationMember.findUnique.mockResolvedValue({ id: 'cm-1' });
      prismaService.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        type: 'GROUP',
      });
      prismaService.conversationMember.createMany.mockResolvedValue({ count: 2 });
      redisService.del.mockResolvedValue(undefined);

      const result = await service.add({
        conversationId: 'conv-1',
        requesterId: 'user-1',
        memberIds: ['user-3', 'user-4'],
      });

      expect(prismaService.conversationMember.createMany).toHaveBeenCalledWith({
        data: [
          { conversationId: 'conv-1', userId: 'user-3' },
          { conversationId: 'conv-1', userId: 'user-4' },
        ],
        skipDuplicates: true,
      });
      expect(redisService.del).toHaveBeenCalledWith(expect.stringContaining('conv-1'));
      expect(result).toEqual({ success: true });
    });

    it('throws NOT_A_MEMBER when requester is not in the conversation', async () => {
      prismaService.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.add({
          conversationId: 'conv-1',
          requesterId: 'user-x',
          memberIds: ['user-3'],
        }),
      ).rejects.toThrow(RpcException);

      expect(prismaService.conversationMember.createMany).not.toHaveBeenCalled();
    });

    it('throws CONVERSATION_NOT_FOUND_OR_NOT_GROUP when conversation is not GROUP type', async () => {
      prismaService.conversationMember.findUnique.mockResolvedValue({ id: 'cm-1' });
      prismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.add({
          conversationId: 'conv-1',
          requesterId: 'user-1',
          memberIds: ['user-3'],
        }),
      ).rejects.toThrow(RpcException);

      expect(prismaService.conversationMember.createMany).not.toHaveBeenCalled();
    });
  });

  describe('leave', () => {
    it('removes member from conversation and invalidates Redis cache', async () => {
      prismaService.conversationMember.findUnique.mockResolvedValue({ id: 'cm-1' });
      prismaService.conversationMember.delete.mockResolvedValue({ id: 'cm-1' });
      redisService.del.mockResolvedValue(undefined);

      const result = await service.leave({ conversationId: 'conv-1', userId: 'user-1' });

      expect(prismaService.conversationMember.delete).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'conv-1', userId: 'user-1' } },
      });
      expect(redisService.del).toHaveBeenCalledWith(expect.stringContaining('conv-1'));
      expect(result).toEqual({ success: true });
    });

    it('throws NOT_A_MEMBER when user is not in the conversation', async () => {
      prismaService.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.leave({ conversationId: 'conv-1', userId: 'user-x' }),
      ).rejects.toThrow(RpcException);

      expect(prismaService.conversationMember.delete).not.toHaveBeenCalled();
    });
  });
});
