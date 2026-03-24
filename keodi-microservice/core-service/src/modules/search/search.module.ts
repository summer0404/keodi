import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchScheduler } from './search.scheduler';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchScheduler],
  exports: [SearchService]
})
export class SearchModule {}
