import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import {
  CreateConversationPayloadDto,
  GetConversationByIdPayloadDto,
  ListConversationsPayloadDto,
  UpdateConversationPayloadDto,
} from 'src/shared/dtos/chat.dto';
import { ConversationType } from 'src/shared/enums/chat.enum';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async create(payload: CreateConversationPayloadDto) {
    const { type, createdById, memberIds, name, avatarUrl, sessionId } = payload;
    const allMemberIds = [...new Set([createdById, ...memberIds])];

    if (type === ConversationType.DIRECT) {
      if (allMemberIds.length !== 2) {
        throw new RpcException('DIRECT conversation requires exactly 2 members');
      }
      const existing = await this.findDirectConversation(allMemberIds[0], allMemberIds[1]);
      if (existing) return existing;
    }

    if (type === ConversationType.GROUP && sessionId) {
      const existing = await this.prismaService.conversation.findFirst({
        where: { sessionId },
        include: { members: true },
      });
      if (existing) return existing;
    }

    return this.prismaService.conversation.create({
      data: {
        type: type as any,
        name,
        avatarUrl,
        createdById,
        sessionId,
        members: {
          create: allMemberIds.map((userId) => ({ userId })),
        },
      },
      include: { members: true },
    });
  }

  private async findDirectConversation(userId1: string, userId2: string) {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT as any,
        AND: [
          { members: { some: { userId: userId1 } } },
          { members: { some: { userId: userId2 } } },
        ],
      },
      include: { members: true },
    });
    return conversation && conversation.members.length === 2 ? conversation : null;
  }

  async getById(payload: GetConversationByIdPayloadDto) {
    const { conversationId, userId } = payload;
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationId,
        members: { some: { userId } },
      },
      include: {
        members: { select: { userId: true, joinedAt: true, lastReadAt: true } },
        lastMessage: {
          select: { id: true, content: true, senderId: true, type: true, createdAt: true },
        },
      },
    });
    if (!conversation) throw new RpcException('CONVERSATION_NOT_FOUND');
    return conversation;
  }

  async list(payload: ListConversationsPayloadDto) {
    const { userId, cursor, limit = 20 } = payload;

    const conversations = await this.prismaService.conversation.findMany({
      where: { members: { some: { userId } } },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { select: { userId: true, lastReadAt: true } },
        lastMessage: {
          select: { id: true, content: true, senderId: true, type: true, createdAt: true },
        },
      },
    });

    const hasNextPage = conversations.length > limit;
    const items = hasNextPage ? conversations.slice(0, limit) : conversations;

    const result = await Promise.all(
      items.map(async (conversation) => {
        const myMember = conversation.members.find((m) => m.userId === userId);
        const lastReadAt = myMember?.lastReadAt;
        const unreadCount = await this.prismaService.message.count({
          where: {
            conversationId: conversation.id,
            deletedAt: null,
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });
        return { ...conversation, unreadCount };
      }),
    );

    return {
      items: result,
      nextCursor: hasNextPage ? items[items.length - 1].id : null,
    };
  }

  async update(payload: UpdateConversationPayloadDto) {
    const { conversationId, userId, name, avatarUrl } = payload;

    const member = await this.prismaService.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new RpcException('NOT_A_MEMBER');

    const updated = await this.prismaService.conversation.update({
      where: { id: conversationId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
    });

    await this.redisService.del(RedisKeys.CHAT_MEMBERS(conversationId));
    return updated;
  }

  async getMembers(conversationId: string): Promise<string[]> {
    const cacheKey = RedisKeys.CHAT_MEMBERS(conversationId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached) as string[];

    const members = await this.prismaService.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);
    await this.redisService.setEx(cacheKey, JSON.stringify(userIds), 600);
    return userIds;
  }
}
