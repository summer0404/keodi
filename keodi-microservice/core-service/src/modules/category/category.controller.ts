import { Controller } from '@nestjs/common';
import { CategoryService } from './category.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @MessagePattern('category.get-list-onboarding')
  async getListOnBoarding() {
    return await this.categoryService.getListOnBoarding();
  }
}
