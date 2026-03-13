import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SearchService } from "./search.service";
import { handleServiceErrorCatching } from "src/shared/helpers/error.helper";

@Injectable()
export class SearchScheduler {
    constructor(private readonly searchService: SearchService,) {}

    @Cron('*/5 * * * *', { disabled: true})
    async updateTrendingSearchesForRedis() {
        try {
            const trendingSearches = await this.searchService.getTrending(); 
            await this.searchService.updateTrendingForRedis(trendingSearches);
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }
}