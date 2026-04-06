import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ratingActionMap } from 'src/shared/constants/review.constant';
import { CreateReviewDto, GetReviewsDto } from 'src/shared/dtos/review.dto';
import { IntelligenceTopics, ReviewTopics } from 'src/shared/constants/topic.constant';


@Injectable()
export class ReviewService {
    constructor(private readonly kafkaService: KafkaService) { }

    async create(userId: string, createReviewDto: CreateReviewDto) {
        this.kafkaService.getClient().emit(IntelligenceTopics.UserAction, {
            userId,
            placeId: createReviewDto.placeId,
            action: ratingActionMap[createReviewDto.rating]
        });

        return await this.kafkaService.sendWithTimeout(ReviewTopics.Create, { userId, ...createReviewDto });
    }

    async getByPlaceId(getReviewsDto: GetReviewsDto, placeId: string) {
        return await this.kafkaService.sendWithTimeout(ReviewTopics.GetByPlaceId, { ...getReviewsDto, placeId });
    }
}
