import { Controller } from '@nestjs/common';
import { CategoryService } from './category.service';
import { MessagePattern } from '@nestjs/microservices';
import { CategoryTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @MessagePattern(CategoryTopics.GetListOnboarding)
  async getListOnBoarding() {
    return await this.categoryService.getListOnBoarding();
  }
}
