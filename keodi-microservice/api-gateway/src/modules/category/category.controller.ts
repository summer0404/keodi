import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiGetListOnboarding, ApiSearchCategories } from './category.swagger';

@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('onboarding')
  @ApiGetListOnboarding()
  async getListOnBoarding() {
    return await this.categoryService.getListOnBoarding();
  }

  @Get('search')
  @ApiSearchCategories()
  async search(
    @Query('q') query: string = '',
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.categoryService.search(query, limit);
  }
}
