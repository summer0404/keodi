import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { RedisModule } from 'src/providers/redis/redis.module';

@Module({
  controllers: [SearchController],
  providers: [SearchService],
  imports: [RedisModule]
})
export class SearchModule {}
