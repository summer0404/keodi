/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags
} from '@nestjs/swagger';
import {
  CoordinateDto,
  CreatePlaceDto,
  CreatePlaceResponseDto,
  NearMePlacesResponseDto,
  NearMeQueryDto,
  SearchDto
} from 'src/shared/dtos/place.dto';
import { PlaceService } from './place.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { ApiCreatePlace, ApiGetForYouPlaces, ApiGetPlaceById, ApiGetPlaceReviews, ApiGetTrendingPlaces, ApiNearMePlace, ApiSearchPlace } from './place.swagger';
import { GetReviewsDto } from 'src/shared/dtos/review.dto';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { RecommendationCacheInterceptor } from 'src/common/interceptors/recommendation-cache.interceptor';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/shared/enums/role.enum';

@ApiTags('Places')
@Controller('places')
@ApiBearerAuth('access-token')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) { }

  @UseGuards(RoleGuard)
  @Roles(Role.OWNER)
  @Post()
  @ApiCreatePlace()
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() createPlaceDto: CreatePlaceDto,
  ): Promise<CreatePlaceResponseDto> {
    return await this.placeService.create(user.id, createPlaceDto);
  }

  @Get('near-me')
  @ApiNearMePlace()
  async getNearbyPlaces(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: NearMeQueryDto): Promise<NearMePlacesResponseDto> {
    return await this.placeService.getNearbyPlaces(query, user.id);
  }

  @Get('search')
  @ApiSearchPlace()
  async search(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: SearchDto
  ) {
    return await this.placeService.search(query, user.id);
  }

  @UseInterceptors(CacheInterceptor)
  @Get('trending')
  @ApiGetTrendingPlaces()
  async getTrending() {
    return await this.placeService.getTrending();
  }

  @UseInterceptors(RecommendationCacheInterceptor)
  @CacheTTL(60)
  @Get('for-you')
  @ApiGetForYouPlaces()
  async getForYou(
    @Query() query: CoordinateDto, 
    @CurrentUser() user: CurrentUserDto
  ) {
    return await this.placeService.getForYou(user.id, query);
  }

  @Get(':id')
  @ApiGetPlaceById()
  async getById(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string
  ) {
    return await this.placeService.getById(id, user.id);
  }

  @Get(':id/reviews')
  @ApiGetPlaceReviews()
  async getReviewsById(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetReviewsDto,
    @Param('id') id: string
  ) {
    return await this.placeService.getReviewsById(query, id, user.id);
  }
}
