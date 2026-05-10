import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { ConversationService } from 'src/modules/conversation/conversation.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { ChatErrorMessages } from 'src/shared/constants/error.constant';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import { NotificationTopics } from 'src/shared/constants/topic.constant';
import {
  DeleteMessagePayloadDto,
  ListMessagesPayloadDto,
  MarkReadPayloadDto,
  SendMessagePayloadDto,
} from 'src/shared/dtos/chat.dto';
import { MessageType } from 'src/shared/enums/chat.enum';
import {
  NotificationPreferredChannel,
  NotificationType,
} from 'src/shared/enums/notification.enum';

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly kafkaService: KafkaService,
    private readonly conversationService: ConversationService,
  ) {}

  async send(payload: SendMessagePayloadDto) {
    const {
      conversationId,
      senderId,
      content,
      type = MessageType.TEXT,
      replyToId,
    } = payload;

    const memberIds = await this.conversationService.getMembers(conversationId);
    if (!memberIds.includes(senderId)) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: ChatErrorMessages.NOT_A_MEMBER,
      });
    }

    const message = await this.prismaService.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type,
        ...(replyToId ? { replyToId } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            pictureUrl: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                pictureUrl: true,
              },
            },
          },
        },
      },
    });

    await this.prismaService.conversation.update({
      where: { id: conversationId },
      data: { lastMessageId: message.id, updatedAt: new Date() },
    });

    await this.redisService.del(RedisKeys.CHAT_RECENT(conversationId));

    const kafkaClient = this.kafkaService.getClient();
    kafkaClient.emit(NotificationTopics.ChatRealtimePush, {
      conversationId,
      event: 'message.new',
      payload: message,
    });

    for (const userId of memberIds) {
      if (userId === senderId) continue;

      const isOnline = await this.redisService.has(RedisKeys.PRESENCE(userId));
      if (isOnline) continue;

      kafkaClient.emit(NotificationTopics.Dispatch, {
        eventId: `chat-message-${message.id}-${userId}`,
        userId,
        type: NotificationType.CHAT_MESSAGE,
        title: 'New message',
        body: content.slice(0, 100),
        data: {
          conversationId,
          messageId: message.id,
          senderId,
        },
        deepLink: `frontend://chat/${conversationId}`,
        preferredChannel: NotificationPreferredChannel.FCM,
        createdAt: new Date().toISOString(),
      });
    }

    return message;
  }

  async list(payload: ListMessagesPayloadDto) {
    const { conversationId, userId, cursor, limit = 30 } = payload;

    const memberIds = await this.conversationService.getMembers(conversationId);
    if (!memberIds.includes(userId)) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: ChatErrorMessages.NOT_A_MEMBER,
      });
    }

    if (!cursor) {
      const cacheKey = RedisKeys.CHAT_RECENT(conversationId);
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const messages = JSON.parse(cached) as any[];
        // Serve cache only when sender data is already present
        if (messages.length === 0 || messages[0].sender !== undefined) {
          return {
            items: messages,
            nextCursor:
              messages.length >= limit
                ? messages[messages.length - 1].id
                : null,
          };
        }
        await this.redisService.del(cacheKey);
      }
    }

    const messages = await this.prismaService.message.findMany({
      where: { conversationId, deletedAt: null },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            pictureUrl: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                pictureUrl: true,
              },
            },
          },
        },
      },
    });

    const hasNextPage = messages.length > limit;
    const items = hasNextPage ? messages.slice(0, limit) : messages;

    if (!cursor) {
      await this.redisService.setEx(
        RedisKeys.CHAT_RECENT(conversationId),
        JSON.stringify(items),
        3600,
      );
    }

    return {
      items,
      nextCursor: hasNextPage ? items[items.length - 1].id : null,
    };
  }

  async delete(payload: DeleteMessagePayloadDto) {
    const { messageId, userId } = payload;

    const message = await this.prismaService.message.findFirst({
      where: { id: messageId, senderId: userId, deletedAt: null },
    });
    if (!message) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: ChatErrorMessages.MESSAGE_NOT_FOUND,
      });
    }

    await this.prismaService.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    await this.redisService.del(RedisKeys.CHAT_RECENT(message.conversationId));

    this.kafkaService.getClient().emit(NotificationTopics.ChatRealtimePush, {
      conversationId: message.conversationId,
      event: 'message.deleted',
      payload: { messageId },
    });

    return { success: true };
  }

  async markRead(payload: MarkReadPayloadDto) {
    await this.prismaService.conversationMember.updateMany({
      where: { conversationId: payload.conversationId, userId: payload.userId },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }
}
