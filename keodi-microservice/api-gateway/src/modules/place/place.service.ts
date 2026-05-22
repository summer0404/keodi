/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { AgentSearchResponseDto, ChatSearchDto, CoordinateDto, CreatePlaceDto, CreatePlaceResponseDto, NearMePlacesResponseDto, NearMeQueryDto, PlaceDistanceDto, SearchDto, UpdatePlaceDto, UpdatePlaceResponseDto } from 'src/shared/dtos/place.dto';
import { GetReviewsDto } from 'src/shared/dtos/review.dto';
import { ReviewService } from '../review/review.service';
import { UserAction } from 'src/shared/enums/user.enum';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ImageService } from 'src/providers/image/image.service';
import { IntelligenceTopics, PlaceTopics, RecommendationTopics } from 'src/shared/constants/topic.constant';
import { AGENT_KAFKA_TIMEOUT_MS } from 'src/shared/constants/kafka.constant';
import { ImageFolders } from 'src/shared/constants/image.constant';

@Injectable()
export class PlaceService {
    constructor(
        private readonly reviewService: ReviewService,
        private readonly kafkaService: KafkaService,
        private readonly imageService: ImageService,
    ) { }

    async getNearbyPlaces(query: NearMeQueryDto, userId: string): Promise<NearMePlacesResponseDto> {
        return await this.kafkaService.sendWithTimeout(PlaceTopics.NearMe, { ...query, userId });
    }

    async create(
        ownerId: string,
        createPlaceDto: CreatePlaceDto,
        featureImage: Buffer,
        featureImageType: string,
    ): Promise<CreatePlaceResponseDto> {
        const featureImageKey = await this.imageService.uploadAndGetKey(
            ImageFolders.PLACE,
            featureImage,
            featureImageType,
        );
        return await this.kafkaService.sendWithTimeout(PlaceTopics.Create, {
            ownerId,
            ...createPlaceDto,
            featureImageKey,
        });
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

    async getAllAdmin(query: any) {
        return await this.kafkaService.sendWithTimeout(PlaceTopics.GetAllAdmin, query);
    }

    async approvePlace(placeId: string) {
        return await this.kafkaService.sendWithTimeout(PlaceTopics.Approve, { placeId });
    }

    async rejectPlace(placeId: string, reason: string) {
        return await this.kafkaService.sendWithTimeout(PlaceTopics.Reject, { placeId, data: { reason } });
    }

    async update(
        placeId: string,
        requesterId: string,
        updatePlaceDto: UpdatePlaceDto,
        featureImage?: Buffer,
        featureImageType?: string,
    ): Promise<UpdatePlaceResponseDto> {
        const featureImageKey = featureImage
            ? await this.imageService.uploadAndGetKey(ImageFolders.PLACE, featureImage, featureImageType)
            : undefined;
        return await this.kafkaService.sendWithTimeout(PlaceTopics.Update, {
            placeId,
            requesterId,
            ...updatePlaceDto,
            ...(featureImageKey ? { featureImageKey } : {}),
        });
    }

    async chatSearch(dto: ChatSearchDto, userId: string): Promise<AgentSearchResponseDto> {
        const { message, placeIds } = await this.kafkaService.sendWithTimeout(
            IntelligenceTopics.AgentSearch,
            { message: dto.message, userId, latitude: dto.latitude, longitude: dto.longitude },
            AGENT_KAFKA_TIMEOUT_MS,
        );

        if (!placeIds?.length) {
            return { message, places: [] };
        }

        const places = await this.kafkaService.sendWithTimeout(
            PlaceTopics.GetByIdsWithDistance,
            { ids: placeIds, userId, latitude: dto.latitude, longitude: dto.longitude },
        );

        return { message, places };
    }
}
