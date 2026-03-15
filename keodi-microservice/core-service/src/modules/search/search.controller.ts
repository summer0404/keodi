import { Controller } from '@nestjs/common';
import { SearchService } from './search.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { CreateSearchDto, SearchTrendingScoreDto } from 'src/shared/dtos/search.dto';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @EventPattern('search.create')
  async create(createdSearchDto: CreateSearchDto) {
    return await this.searchService.create(createdSearchDto);
  }

  @MessagePattern('search.trending')
  async getTrending() {
    return await this.searchService.getTrending();
  }

  @EventPattern('search.update-trending-for-redis')
  async updateTrendingForRedis(
    @Payload() payload: {trendingSearches: SearchTrendingScoreDto[]}
  ) {
    return await this.searchService.updateTrendingForRedis(payload.trendingSearches);
  }
}
