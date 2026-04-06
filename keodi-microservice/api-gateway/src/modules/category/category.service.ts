import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { CategoryTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class CategoryService {
    constructor(private readonly kafkaService: KafkaService) {}

    async getListOnBoarding() {
        return await this.kafkaService.sendWithTimeout(CategoryTopics.GetListOnboarding, {});
    }
}
