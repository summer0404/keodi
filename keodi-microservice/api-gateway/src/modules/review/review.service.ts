import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { ratingActionMap } from 'src/common/constants/review.constant';
import { CreateReviewDto, GetReviewsDto } from 'src/common/dtos/review.dto';


@Injectable()
export class ReviewService {
    constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) { }

    async create(userId: string, createReviewDto: CreateReviewDto) {
        this.client.emit('intelligence.user-action', {
            userId,
            placeId: createReviewDto.placeId,
            action: ratingActionMap[createReviewDto.rating]
        });

        return await firstValueFrom(
            this.client.send('review.create', { userId, ...createReviewDto })
        );
    }

    async getByPlaceId(getReviewsDto: GetReviewsDto) {
        return await firstValueFrom(
            this.client.send('review.get_by_place_id', getReviewsDto)
        );
    }
}
