import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateConversationPayloadDto,
  GetConversationByIdPayloadDto,
  ListConversationsPayloadDto,
  UpdateConversationPayloadDto,
} from 'src/shared/dtos/chat.dto';
import { ChatTopics } from 'src/shared/constants/topic.contant';
import { ConversationService } from './conversation.service';

@Controller()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @MessagePattern(ChatTopics.Conversation.Create)
  async create(@Payload() payload: CreateConversationPayloadDto) {
    return this.conversationService.create(payload);
  }

  @MessagePattern(ChatTopics.Conversation.GetById)
  async getById(@Payload() payload: GetConversationByIdPayloadDto) {
    return this.conversationService.getById(payload);
  }

  @MessagePattern(ChatTopics.Conversation.List)
  async list(@Payload() payload: ListConversationsPayloadDto) {
    return this.conversationService.list(payload);
  }

  @MessagePattern(ChatTopics.Conversation.Update)
  async update(@Payload() payload: UpdateConversationPayloadDto) {
    return this.conversationService.update(payload);
  }
}
