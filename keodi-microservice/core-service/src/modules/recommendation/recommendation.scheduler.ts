import { Injectable, Logger } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { Cron } from '@nestjs/schedule/dist/decorators/cron.decorator';
import { SearchService } from '../search/search.service';

@Injectable()
export class RecommendationScheduler {
  private readonly logger = new Logger(RecommendationScheduler.name);

  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly searchService: SearchService,
  ) {}

  @Cron('*/5 * * * *')
  async updateTrendingForRedis() {
    this.logger.log('Running recommendation scheduler to update trending data in Redis...');
    const trendingSearches = await this.searchService.getTrending();
    await this.searchService.updateTrendingForRedis(trendingSearches);

    await this.recommendationService.updatePlaceFromTrendingSearchesForRedis(
      trendingSearches
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((search) => search.extractedTerm),
    );
    await this.recommendationService.updateTrendingPlaceFromActionsForRedis();
  }

  // @Cron('*/1 * * * *') // For testing, run every minute
  @Cron('0 3 * * 0', { disabled: true })
  async trainRankingModel() {
    this.logger.log('Running recommendation scheduler to train ranking model...');
    return this.recommendationService.trainRankingModel()
  }
}



