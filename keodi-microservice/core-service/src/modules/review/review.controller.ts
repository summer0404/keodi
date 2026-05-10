import { Controller } from '@nestjs/common';
import { ReviewService } from './review.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateReviewDto,
  DeleteResponseDto,
  FlagReviewDto,
  GetAdminReviewsDto,
  GetOwnerReviewsDto,
  GetReviewsDto,
  RespondToReviewDto,
  ReviewIdDto,
  UpdateResponseDto,
} from 'src/shared/dtos/review.dto';
import { ReviewTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @MessagePattern(ReviewTopics.Create)
  async create(@Payload() data: CreateReviewDto) {
    return this.reviewService.create(data);
  }

  @MessagePattern(ReviewTopics.GetByPlaceId)
  async getReviewsById(@Payload() data: GetReviewsDto) {
    return await this.reviewService.getByPlaceId(data);
  }

  @MessagePattern(ReviewTopics.GetOwnerReviews)
  async getOwnerReviews(@Payload() data: GetOwnerReviewsDto) {
    return await this.reviewService.getOwnerReviews(data);
  }

  @MessagePattern(ReviewTopics.Respond)
  async respondToReview(@Payload() data: RespondToReviewDto) {
    return await this.reviewService.respondToReview(data);
  }

  @MessagePattern(ReviewTopics.UpdateResponse)
  async updateResponse(@Payload() data: UpdateResponseDto) {
    return await this.reviewService.updateResponse(data);
  }

  @MessagePattern(ReviewTopics.DeleteResponse)
  async deleteResponse(@Payload() data: DeleteResponseDto) {
    return await this.reviewService.deleteResponse(data);
  }

  @MessagePattern(ReviewTopics.Flag)
  async flagReview(@Payload() data: FlagReviewDto) {
    return await this.reviewService.flagReview(data);
  }

  @MessagePattern(ReviewTopics.GetAdminReviews)
  async getAdminReviews(@Payload() data: GetAdminReviewsDto) {
    return await this.reviewService.getAdminReviews(data);
  }

  @MessagePattern(ReviewTopics.ApproveFlags)
  async approveFlags(@Payload() data: ReviewIdDto) {
    return await this.reviewService.approveFlags(data);
  }

  @MessagePattern(ReviewTopics.RejectFlags)
  async rejectFlags(@Payload() data: ReviewIdDto) {
    return await this.reviewService.rejectFlags(data);
  }
}
