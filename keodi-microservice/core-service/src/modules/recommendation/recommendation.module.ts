import { Module } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { RedisModule } from 'src/providers/redis/redis.module';
import { SearchModule } from '../search/search.module';
import { RecommendationScheduler } from './recommendation.scheduler';
import { PlaceModule } from '../place/place.module';
import { RecommendationHelper } from './recommendation.helper';
import { ImageService } from '../image/image.service';

@Module({
  controllers: [RecommendationController],
  providers: [
    RecommendationService, 
    RecommendationScheduler,
    RecommendationHelper,
  ],
  imports: [
    RedisModule, 
    SearchModule,
    ImageService
  ],
})
export class RecommendationModule {}
