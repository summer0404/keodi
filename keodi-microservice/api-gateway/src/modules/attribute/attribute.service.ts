import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { CreateAttributeDto } from 'src/shared/dtos/attribute.dto';

@Injectable()
export class AttributeService {
    constructor(private readonly kafkaService: KafkaService) {}

    async create(createAttributeDto: CreateAttributeDto) {
        return await firstValueFrom(
            this.kafkaService.getClient().send('attribute.create', createAttributeDto)
        );
    }
}
