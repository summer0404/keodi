import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ratingActionMap } from 'src/shared/constants/review.constant';
import { CreateReviewDto, GetReviewsDto } from 'src/shared/dtos/review.dto';


@Injectable()
export class ReviewService {
    constructor(private readonly kafkaService: KafkaService) { }

    async create(userId: string, createReviewDto: CreateReviewDto) {
        this.kafkaService.getClient().emit('intelligence.user-action', {
            userId,
            placeId: createReviewDto.placeId,
            action: ratingActionMap[createReviewDto.rating]
        });

        return await firstValueFrom(
            this.kafkaService.getClient().send('review.create', { userId, ...createReviewDto })
        );
    }

    async getByPlaceId(getReviewsDto: GetReviewsDto, placeId: string) {
        return await firstValueFrom(
            this.kafkaService.getClient().send('review.get_by_place_id', { ...getReviewsDto, placeId })
        );
    }
}
