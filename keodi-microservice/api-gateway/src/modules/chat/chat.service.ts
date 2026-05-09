import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  ConversationTopics,
  MemberTopics,
  MessageTopics,
} from 'src/shared/constants/topic.constant';
import {
  AddMembersDto,
  CreateConversationDto,
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from 'src/shared/dtos/chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly kafkaService: KafkaService) {}

  createConversation(userId: string, dto: CreateConversationDto) {
    return this.kafkaService.sendWithTimeout(ConversationTopics.Create, {
      ...dto,
      createdById: userId,
      memberIds: dto.memberIds ?? [],
    });
  }

  listConversations(userId: string, query: ListConversationsQueryDto) {
    return this.kafkaService.sendWithTimeout(ConversationTopics.List, {
      userId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  getConversation(userId: string, conversationId: string) {
    return this.kafkaService.sendWithTimeout(ConversationTopics.GetById, {
      conversationId,
      userId,
    });
  }

  updateConversation(userId: string, conversationId: string, dto: UpdateConversationDto) {
    return this.kafkaService.sendWithTimeout(ConversationTopics.Update, {
      conversationId,
      userId,
      ...dto,
    });
  }

  listMessages(userId: string, conversationId: string, query: ListMessagesQueryDto) {
    return this.kafkaService.sendWithTimeout(MessageTopics.List, {
      conversationId,
      userId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    return this.kafkaService.sendWithTimeout(MessageTopics.Send, {
      conversationId,
      senderId: userId,
      content: dto.content,
      type: dto.type,
      replyToId: dto.replyToId,
    });
  }

  deleteMessage(userId: string, messageId: string) {
    return this.kafkaService.sendWithTimeout(MessageTopics.Delete, {
      messageId,
      userId,
    });
  }

  markRead(userId: string, conversationId: string) {
    return this.kafkaService.sendWithTimeout(MessageTopics.MarkRead, {
      conversationId,
      userId,
    });
  }

  addMembers(userId: string, conversationId: string, dto: AddMembersDto) {
    return this.kafkaService.sendWithTimeout(MemberTopics.Add, {
      conversationId,
      requesterId: userId,
      memberIds: dto.memberIds,
    });
  }

  leaveConversation(userId: string, conversationId: string) {
    return this.kafkaService.sendWithTimeout(MemberTopics.Leave, {
      conversationId,
      userId,
    });
  }
}
