import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RecommendationTopics } from 'src/shared/constants/topic.constant';
import { CoordinateDto } from 'src/shared/dtos/place.dto';
import { RecommendationService } from './recommendation.service';

@Controller()
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @MessagePattern(RecommendationTopics.Trending)
  async getTrending() {
    return await this.recommendationService.getTrending();
  }

  @MessagePattern(RecommendationTopics.ForYou)
  async getForYou(
    @Payload() data: { userId: string; coordinateDto: CoordinateDto },
  ) {
    const { userId, coordinateDto } = data;
    return await this.recommendationService.getForYou(
      userId,
      coordinateDto.latitude,
      coordinateDto.longitude,
    );
  }

  @MessagePattern(RecommendationTopics.GroupSessionGetRecommendations)
  async getGroupSessionRecommendations(
    @Payload()
    data: {
      sessionId: string;
      userId?: string;
      guestId?: string;
    },
  ) {
    return await this.recommendationService.getGroupSessionRecommendations(
      data,
    );
  }

  @MessagePattern(RecommendationTopics.GroupSessionInvalidateCache)
  async invalidateGroupSessionRecommendationCache(
    @Payload()
    data: {
      sessionId: string;
    },
  ) {
    await this.recommendationService.handleGroupSessionRecommendationCacheInvalidationEvent(
      data,
    );
    return { success: true };
  }
}
