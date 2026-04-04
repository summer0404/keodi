import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SearchService } from "./search.service";

@Injectable()
export class SearchScheduler {
    constructor(private readonly searchService: SearchService) {}

    @Cron('0 3 * * 0', { disabled: true})
    async clearOldHistory() {
        console.log('Running search scheduler to clear old search history...');
        return await this.searchService.clearOldHistory();
    }
}