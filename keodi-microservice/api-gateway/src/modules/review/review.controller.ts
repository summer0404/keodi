import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, FlagReviewBodyDto, GetOwnerReviewsQueryDto, RespondToReviewBodyDto, UpdateReviewResponseBodyDto } from 'src/shared/dtos/review.dto';
import {
  ApiApproveReviewFlags,
  ApiCreateReview,
  ApiDeleteReviewResponse,
  ApiFlagReview,
  ApiGetOwnerReviews,
  ApiRejectReviewFlags,
  ApiRespondToReview,
  ApiUpdateReviewResponse,
} from './review.swagger';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/shared/enums/role.enum';

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

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.OWNER)
  @Get('owner')
  @ApiGetOwnerReviews()
  async getOwnerReviews(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetOwnerReviewsQueryDto,
  ) {
    return this.reviewService.getOwnerReviews(user.id, query);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.OWNER)
  @Post(':id/response')
  @ApiRespondToReview()
  async respondToReview(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') reviewId: string,
    @Body() dto: RespondToReviewBodyDto,
  ) {
    return this.reviewService.respondToReview(reviewId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.OWNER)
  @Patch(':id/response')
  @ApiUpdateReviewResponse()
  async updateResponse(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') reviewId: string,
    @Body() dto: UpdateReviewResponseBodyDto,
  ) {
    return this.reviewService.updateResponse(reviewId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.OWNER)
  @Delete(':id/response')
  @ApiDeleteReviewResponse()
  async deleteResponse(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') reviewId: string,
  ) {
    return this.reviewService.deleteResponse(reviewId, user.id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.OWNER)
  @Post(':id/flag')
  @ApiFlagReview()
  async flagReview(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') reviewId: string,
    @Body() dto: FlagReviewBodyDto,
  ) {
    return this.reviewService.flagReview(reviewId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Post(':id/approve-flags')
  @ApiApproveReviewFlags()
  async approveFlags(@Param('id') reviewId: string) {
    return this.reviewService.approveFlags(reviewId);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Post(':id/reject-flags')
  @ApiRejectReviewFlags()
  async rejectFlags(@Param('id') reviewId: string) {
    return this.reviewService.rejectFlags(reviewId);
  }
}
