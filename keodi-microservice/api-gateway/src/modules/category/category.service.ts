import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { KafkaService } from 'src/providers/kafka/kafka.service';

@Injectable()
export class CategoryService {
    constructor(private readonly kafkaService: KafkaService) {}

    async getListOnBoarding() {
        return await firstValueFrom(this.kafkaService.getClient().send('category.get-list-onboarding', {}));
    }
}
