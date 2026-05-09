import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  DeleteMessagePayloadDto,
  ListMessagesPayloadDto,
  MarkReadPayloadDto,
  SendMessagePayloadDto,
} from 'src/shared/dtos/chat.dto';
import { MessageTopics } from 'src/shared/constants/topic.constant';
import { MessageService } from './message.service';

@Controller()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @MessagePattern(MessageTopics.Send)
  async send(@Payload() payload: SendMessagePayloadDto) {
    return this.messageService.send(payload);
  }

  @MessagePattern(MessageTopics.List)
  async list(@Payload() payload: ListMessagesPayloadDto) {
    return this.messageService.list(payload);
  }

  @MessagePattern(MessageTopics.Delete)
  async delete(@Payload() payload: DeleteMessagePayloadDto) {
    return this.messageService.delete(payload);
  }

  @MessagePattern(MessageTopics.MarkRead)
  async markRead(@Payload() payload: MarkReadPayloadDto) {
    return this.messageService.markRead(payload);
  }
}
