import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { CreateReviewDto } from 'src/common/dtos/review.dto';

@Injectable()
export class ReviewService {
    constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

    async create(userId: string, createReviewDto: CreateReviewDto) {
        return await firstValueFrom(
            this.client.send('review.create', { userId, ...createReviewDto })
        );
    }
}
