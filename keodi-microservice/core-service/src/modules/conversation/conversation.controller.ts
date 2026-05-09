import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateConversationPayloadDto,
  GetConversationByIdPayloadDto,
  ListConversationsPayloadDto,
  UpdateConversationPayloadDto,
} from 'src/shared/dtos/chat.dto';import { ConversationTopics } from 'src/shared/constants/topic.constant';
import { ConversationService } from './conversation.service';

@Controller()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @MessagePattern(ConversationTopics.Create)
  async create(@Payload() payload: CreateConversationPayloadDto) {
    return this.conversationService.create(payload);
  }

  @MessagePattern(ConversationTopics.GetById)
  async getById(@Payload() payload: GetConversationByIdPayloadDto) {
    return this.conversationService.getById(payload);
  }

  @MessagePattern(ConversationTopics.List)
  async list(@Payload() payload: ListConversationsPayloadDto) {
    return this.conversationService.list(payload);
  }

  @MessagePattern(ConversationTopics.Update)
  async update(@Payload() payload: UpdateConversationPayloadDto) {
    return this.conversationService.update(payload);
  }
}
