import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices/client/client-kafka';
import { firstValueFrom } from 'rxjs';
import { CreateAttributeDto } from 'src/shared/dtos/attribute.dto';

@Injectable()
export class AttributeService {
    constructor(@Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka) {}

    async create(createAttributeDto: CreateAttributeDto) {
        return await firstValueFrom(
            this.kafkaClient.send('attribute.create', createAttributeDto)
        );
    }
}
