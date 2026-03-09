/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NearMePlacesResponseDto, NearMeQueryDto, PlaceDistanceDto, SearchDto } from 'src/common/dtos/place.dto';
import { GetReviewsDto } from 'src/common/dtos/review.dto';
import { ReviewService } from '../review/review.service';
import { UserAction } from 'src/common/enums/user.enum';

@Injectable()
export class PlaceService {
    constructor(
        private readonly reviewService: ReviewService,
        @Inject('KAFKA_SERVICE') private readonly client: ClientKafka
    ) { }

    async getNearbyPlaces(query: NearMeQueryDto, userId: string): Promise<NearMePlacesResponseDto> {
        return await firstValueFrom(
            this.client.send('place.near-me', {
                ...query,
                userId,
            })
        );
    }

    async search(
        query: SearchDto,
        userId: string
    ): Promise<NearMePlacesResponseDto> {
        return await firstValueFrom(
            this.client.send('place.search', {
                ...query,
                userId,
            })
        );
    }

    async getById(id: string, userId: string): Promise<PlaceDistanceDto> {
        this.client.emit('intelligence.user-action', {
            userId,
            placeId: id,
            action: UserAction.CLICK,
        });

        return await firstValueFrom(this.client.send('place.get-by-id', { id, userId }));
    }

    async getReviewsById (getReviewsDto: GetReviewsDto, userId: string) {
        this.client.emit('intelligence.user-action', {
            userId,
            placeId: getReviewsDto.placeId,
            action: UserAction.READ_REVIEWS,
        });

        return await this.reviewService.getByPlaceId(getReviewsDto);
    }
}
