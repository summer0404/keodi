import { Controller } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { MessagePattern } from '@nestjs/microservices';
import { CoordinateDto } from 'src/shared/dtos/place.dto';
import { RecommendationTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService
  ) {}

  @MessagePattern(RecommendationTopics.Trending)
  async getTrending() {
    return await this.recommendationService.getTrending();
  }

  @MessagePattern(RecommendationTopics.ForYou)
  async getForYou(data: { userId: string, coordinateDto: CoordinateDto }) {
    const { userId, coordinateDto } = data;
    return await this.recommendationService.getForYou(
      userId, 
      coordinateDto.latitude, 
      coordinateDto.longitude
    );
  }
}
