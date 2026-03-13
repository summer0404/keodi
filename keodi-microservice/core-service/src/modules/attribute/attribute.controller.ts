import { Controller } from '@nestjs/common';
import { AttributeService } from './attribute.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateAttributeDto } from 'src/shared/dtos/attribute.dto';

@Controller()
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @MessagePattern('attribute.create')
  async create(@Payload() payload: CreateAttributeDto) {
    return await this.attributeService.create(payload);
  }
}
