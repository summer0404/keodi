import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ChatTopics } from 'src/shared/constants/topic.constant';
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
    return this.kafkaService.sendWithTimeout(ChatTopics.Conversation.Create, {
      ...dto,
      createdById: userId,
      memberIds: dto.memberIds ?? [],
    });
  }

  listConversations(userId: string, query: ListConversationsQueryDto) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Conversation.List, {
      userId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  getConversation(userId: string, conversationId: string) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Conversation.GetById, {
      conversationId,
      userId,
    });
  }

  updateConversation(userId: string, conversationId: string, dto: UpdateConversationDto) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Conversation.Update, {
      conversationId,
      userId,
      ...dto,
    });
  }

  listMessages(userId: string, conversationId: string, query: ListMessagesQueryDto) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Message.List, {
      conversationId,
      userId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Message.Send, {
      conversationId,
      senderId: userId,
      content: dto.content,
      type: dto.type,
      replyToId: dto.replyToId,
    });
  }

  deleteMessage(userId: string, messageId: string) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Message.Delete, {
      messageId,
      userId,
    });
  }

  markRead(userId: string, conversationId: string) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Message.MarkRead, {
      conversationId,
      userId,
    });
  }

  addMembers(userId: string, conversationId: string, dto: AddMembersDto) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Member.Add, {
      conversationId,
      requesterId: userId,
      memberIds: dto.memberIds,
    });
  }

  leaveConversation(userId: string, conversationId: string) {
    return this.kafkaService.sendWithTimeout(ChatTopics.Member.Leave, {
      conversationId,
      userId,
    });
  }
}
