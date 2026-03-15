import { Controller, Get } from '@nestjs/common';
import { CategoryService } from './category.service';
import { ApiBearerAuth, ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { CategoryDto } from 'src/shared/dtos/category.dto';

@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('onboarding')
  @ApiProperty({ description: 'Get list of onboarding categories' })
  @ApiOkResponse({ description: 'List of onboarding categories', type: [CategoryDto] })
  async getListOnBoarding() {
    return await this.categoryService.getListOnBoarding();
  }
}
