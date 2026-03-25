import { Module } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { SearchModule } from '../search/search.module';
import { RecommendationScheduler } from './recommendation.scheduler';
import { RecommendationHelper } from './recommendation.helper';
import { ImageModule } from '../image/image.module';

@Module({
  controllers: [RecommendationController],
  providers: [
    RecommendationService, 
    RecommendationScheduler,
    RecommendationHelper,
  ],
  imports: [
    SearchModule,
    ImageModule
  ],
})
export class RecommendationModule {}
