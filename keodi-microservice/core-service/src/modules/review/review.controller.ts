import { Controller } from '@nestjs/common';
import { ReviewService } from './review.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateReviewDto } from 'src/common/dtos/review.dto';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @MessagePattern('review.create')
  async create(@Payload() data: CreateReviewDto) {
    return this.reviewService.create(data);
  }
}
