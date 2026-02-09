import { Body, Controller, Post } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from 'src/common/dtos/review.dto';
import { ApiCreateReview } from './review.swagger';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/common/dtos/user.dto';

@ApiTags('Reviews')
@Controller('reviews')
@ApiBearerAuth('access-token')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiCreateReview()
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() createReviewDto: CreateReviewDto
  ) {
    return this.reviewService.create(user.id, createReviewDto);
  }
}
