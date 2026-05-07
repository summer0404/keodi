import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ratingActionMap } from 'src/shared/constants/review.constant';
import {
  CreateReviewDto,
  FlagReviewBodyDto,
  GetOwnerReviewsQueryDto,
  GetReviewsDto,
  RespondToReviewBodyDto,
  UpdateReviewResponseBodyDto,
} from 'src/shared/dtos/review.dto';
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

    async getOwnerReviews(ownerId: string, query: GetOwnerReviewsQueryDto) {
        return await this.kafkaService.sendWithTimeout(ReviewTopics.GetOwnerReviews, { ownerId, ...query });
    }

    async respondToReview(reviewId: string, ownerId: string, dto: RespondToReviewBodyDto) {
        return await this.kafkaService.sendWithTimeout(ReviewTopics.Respond, { reviewId, ownerId, text: dto.text });
    }

    async updateResponse(reviewId: string, ownerId: string, dto: UpdateReviewResponseBodyDto) {
        return await this.kafkaService.sendWithTimeout(ReviewTopics.UpdateResponse, { reviewId, ownerId, text: dto.text });
    }

    async deleteResponse(reviewId: string, ownerId: string) {
        return await this.kafkaService.sendWithTimeout(ReviewTopics.DeleteResponse, { reviewId, ownerId });
    }

    async flagReview(reviewId: string, ownerId: string, dto: FlagReviewBodyDto) {
        return await this.kafkaService.sendWithTimeout(ReviewTopics.Flag, { reviewId, ownerId, reason: dto.reason });
    }

    async approveFlags(reviewId: string) {
        return await this.kafkaService.sendWithTimeout(ReviewTopics.ApproveFlags, { reviewId });
    }

    async rejectFlags(reviewId: string) {
        return await this.kafkaService.sendWithTimeout(ReviewTopics.RejectFlags, { reviewId });
    }
}
