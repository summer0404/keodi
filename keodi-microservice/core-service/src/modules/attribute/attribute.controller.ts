import { Controller } from '@nestjs/common';
import { AttributeService } from './attribute.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateAttributeDto } from 'src/shared/dtos/attribute.dto';
import { AttributeTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @MessagePattern(AttributeTopics.Create)
  async create(@Payload() payload: CreateAttributeDto) {
    return await this.attributeService.create(payload);
  }
}
