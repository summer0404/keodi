import { Controller } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { MessagePattern } from '@nestjs/microservices';
import { CoordinateDto } from 'src/shared/dtos/place.dto';

@Controller()
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService
  ) {}

  @MessagePattern('recommendation.trending')
  async getTrending() {
    return await this.recommendationService.getTrending();
  }

  @MessagePattern('recommendation.for-you')
  async getForYou(data: { userId: string, coordinateDto: CoordinateDto }) {
    const { userId, coordinateDto } = data;
    return await this.recommendationService.getForYou(
      userId, 
      coordinateDto.latitude, 
      coordinateDto.longitude
    );
  }
}
