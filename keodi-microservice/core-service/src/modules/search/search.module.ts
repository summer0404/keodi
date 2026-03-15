import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { RedisModule } from 'src/providers/redis/redis.module';
import { SearchScheduler } from './search.scheduler';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchScheduler],
  imports: [RedisModule]
})
export class SearchModule {}
