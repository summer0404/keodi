import { Controller } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService
  ) {}

  @MessagePattern('recommendation.trending')
  async getTrending() {
    return await this.recommendationService.getTrending();
  }
}
