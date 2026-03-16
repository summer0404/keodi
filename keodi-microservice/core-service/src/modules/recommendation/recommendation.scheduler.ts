import { Injectable } from "@nestjs/common";
import { RecommendationService } from "./recommendation.service";
import { Cron } from "@nestjs/schedule/dist/decorators/cron.decorator";
import { SearchService } from "../search/search.service";

@Injectable()
export class RecommendationScheduler {
    constructor(
        private readonly recommendationService: RecommendationService,
        private readonly searchService: SearchService
    ) { }

    @Cron('*/5 * * * *')
    async updateTrendingForRedis() {
        const trendingSearches = await this.searchService.getTrending();
        await this.searchService.updateTrendingForRedis(trendingSearches);
        
        await this.recommendationService.updatePlaceFromTrendingSearchesForRedis(trendingSearches
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(search => search.extractedTerm));
        await this.recommendationService.updateTrendingPlaceFromActionsForRedis();
    }
}