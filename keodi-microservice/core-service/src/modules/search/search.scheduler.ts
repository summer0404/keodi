import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SearchService } from "./search.service";

@Injectable()
export class SearchScheduler {
    constructor(private readonly searchService: SearchService,) {}

    @Cron('*/5 * * * *')
    async updateTrendingSearchesForRedis() {
        const trendingSearches = await this.searchService.getTrending(); 
        await this.searchService.updateTrendingForRedis(trendingSearches);
    }

    @Cron('0 3 * * 0', { disabled: true})
    async clearOldHistory() {
        return await this.searchService.clearOldHistory();
    }
}