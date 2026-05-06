import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  DeleteMessagePayloadDto,
  ListMessagesPayloadDto,
  MarkReadPayloadDto,
  SendMessagePayloadDto,
} from 'src/shared/dtos/chat.dto';
import { ChatTopics } from 'src/shared/constants/topic.contant';
import { MessageService } from './message.service';

@Controller()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @MessagePattern(ChatTopics.Message.Send)
  async send(@Payload() payload: SendMessagePayloadDto) {
    return this.messageService.send(payload);
  }

  @MessagePattern(ChatTopics.Message.List)
  async list(@Payload() payload: ListMessagesPayloadDto) {
    return this.messageService.list(payload);
  }

  @MessagePattern(ChatTopics.Message.Delete)
  async delete(@Payload() payload: DeleteMessagePayloadDto) {
    return this.messageService.delete(payload);
  }

  @MessagePattern(ChatTopics.Message.MarkRead)
  async markRead(@Payload() payload: MarkReadPayloadDto) {
    return this.messageService.markRead(payload);
  }
}
