import { Controller } from '@nestjs/common';
import { SearchService } from './search.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { CreateSearchDto, SearchTrendingScoreDto } from 'src/shared/dtos/search.dto';
import { SearchTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @EventPattern(SearchTopics.Create)
  async create(createdSearchDto: CreateSearchDto) {
    return await this.searchService.create(createdSearchDto);
  }

  @MessagePattern(SearchTopics.Trending)
  async getTrending() {
    return await this.searchService.getTrending();
  }

  @EventPattern(SearchTopics.UpdateTrendingForRedis)
  async updateTrendingForRedis(
    @Payload() payload: {trendingSearches: SearchTrendingScoreDto[]}
  ) {
    return await this.searchService.updateTrendingForRedis(payload.trendingSearches);
  }
}
