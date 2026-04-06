import { Controller } from '@nestjs/common';
import { ReviewService } from './review.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateReviewDto, GetReviewsDto } from 'src/shared/dtos/review.dto';
import { ReviewTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @MessagePattern(ReviewTopics.Create)
  async create(@Payload() data: CreateReviewDto) {
    return this.reviewService.create(data);
  }

  @MessagePattern(ReviewTopics.GetByPlaceId)
  async getReviewsById(@Payload() data: GetReviewsDto) {
    return await this.reviewService.getByPlaceId(data);
  }
}
