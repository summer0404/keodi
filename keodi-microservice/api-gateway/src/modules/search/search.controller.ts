import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { SearchService } from './search.service';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('trending')
  @UseInterceptors(CacheInterceptor)
  async getTrending() {
    
  }
}
