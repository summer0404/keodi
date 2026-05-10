import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SearchService } from './search.service';

@Injectable()
export class SearchScheduler {
  private readonly logger = new Logger(SearchScheduler.name);

  constructor(private readonly searchService: SearchService) {}

  @Cron('0 3 * * 0', { disabled: true })
  async clearOldHistory() {
    this.logger.log('Running search scheduler to clear old search history...');
    return await this.searchService.clearOldHistory();
  }
}
