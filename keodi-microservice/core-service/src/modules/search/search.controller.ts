import { Controller } from '@nestjs/common';
import { SearchService } from './search.service';
import { EventPattern } from '@nestjs/microservices';
import { CreateSearchDto } from 'src/shared/dtos/search.dto';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @EventPattern('search.create')
  async create(createdSearchDto: CreateSearchDto) {
    return await this.searchService.create(createdSearchDto);
  }
}
