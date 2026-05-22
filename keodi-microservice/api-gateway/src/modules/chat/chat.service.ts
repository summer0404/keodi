import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ImageService } from 'src/providers/image/image.service';
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
import { MessageType } from 'src/shared/enums/chat.enum';
import { ImageFolders } from 'src/shared/constants/image.constant';

@Injectable()
export class ChatService {
  constructor(
    private readonly kafkaService: KafkaService,
    private readonly imageService: ImageService,
  ) {}

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

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto, file?: Express.Multer.File) {
    let content = dto.content ?? '';

    if (dto.type === MessageType.IMAGE && file) {
      content = await this.imageService.uploadAndGetKey(
        ImageFolders.CHAT,
        file.buffer,
        file.mimetype,
      );
    }

    return this.kafkaService.sendWithTimeout(MessageTopics.Send, {
      conversationId,
      senderId: userId,
      content,
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
