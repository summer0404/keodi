import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { CreateAttributeDto } from 'src/shared/dtos/attribute.dto';
import { AttributeTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class AttributeService {
    constructor(private readonly kafkaService: KafkaService) {}

    async create(createAttributeDto: CreateAttributeDto) {
        return await this.kafkaService.sendWithTimeout(AttributeTopics.Create, createAttributeDto);
    }
}
