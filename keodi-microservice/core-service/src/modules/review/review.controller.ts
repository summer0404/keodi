import { Controller } from '@nestjs/common';
import { ReviewService } from './review.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @MessagePattern('review.create')
  async create() {
    return this.reviewService.create();
  }
}
