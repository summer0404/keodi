import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { SearchService } from './search.service';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiGetTrending } from './search.swagger';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('search')
@ApiBearerAuth('access-token')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('trending')
  @UseInterceptors(CacheInterceptor)
  @ApiGetTrending()
  async getTrending() {
    return await this.searchService.getTrending();
  }
}
