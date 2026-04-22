/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CoordinateDto, CreatePlaceDto, CreatePlaceResponseDto, NearMePlacesResponseDto, NearMeQueryDto, PlaceDistanceDto, SearchDto } from 'src/shared/dtos/place.dto';
import { GetReviewsDto } from 'src/shared/dtos/review.dto';
import { ReviewService } from '../review/review.service';
import { UserAction } from 'src/shared/enums/user.enum';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { IntelligenceTopics, PlaceTopics, RecommendationTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class PlaceService {
    constructor(
        private readonly reviewService: ReviewService,
        private readonly kafkaService: KafkaService,
    ) { }

    async getNearbyPlaces(query: NearMeQueryDto, userId: string): Promise<NearMePlacesResponseDto> {
        return await this.kafkaService.sendWithTimeout(PlaceTopics.NearMe, { ...query, userId });
    }

    async create(ownerId: string, createPlaceDto: CreatePlaceDto): Promise<CreatePlaceResponseDto> {
        return await this.kafkaService.sendWithTimeout(PlaceTopics.Create, { ownerId, ...createPlaceDto });
    }

    async search(
        query: SearchDto,
        userId: string
    ): Promise<NearMePlacesResponseDto> {
        return await this.kafkaService.sendWithTimeout(PlaceTopics.Search, { ...query, userId });
    }

    async getById(id: string, userId: string): Promise<PlaceDistanceDto> {
        this.kafkaService.getClient().emit(IntelligenceTopics.UserAction, {
            userId,
            placeId: id,
            action: UserAction.CLICK,
        });

        return await this.kafkaService.sendWithTimeout(PlaceTopics.GetById, { id, userId });
    }

    async getReviewsById (getReviewsDto: GetReviewsDto, placeId: string, userId: string) {
        this.kafkaService.getClient().emit(IntelligenceTopics.UserAction, {
            userId,
            placeId,
            action: UserAction.READ_REVIEWS,
        });

        return await this.reviewService.getByPlaceId(getReviewsDto, placeId);
    }

    async getTrending() {
        return await this.kafkaService.sendWithTimeout(RecommendationTopics.Trending, {});
    }

    async getForYou(userId: string, coordinateDto: CoordinateDto) {
        return await this.kafkaService.sendWithTimeout(RecommendationTopics.ForYou, { userId, coordinateDto });
    }
}
