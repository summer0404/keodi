/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags
} from '@nestjs/swagger';
import {
  NearMePlacesResponseDto,
  NearMeQueryDto,
  SearchDto
} from 'src/shared/dtos/place.dto';
import { PlaceService } from './place.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { ApiGetPlaceById, ApiGetPlaceReviews, ApiGetTrendingPlaces, ApiNearMePlace, ApiSearchPlace } from './place.swagger';
import { GetReviewsDto } from 'src/shared/dtos/review.dto';
import { CacheInterceptor } from '@nestjs/cache-manager';

@ApiTags('Places')
@Controller('places')
@ApiBearerAuth('access-token')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

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

  @UseInterceptors(CacheInterceptor)
  @Get('trending')
  @ApiGetTrendingPlaces()
  async getTrending() {
    return await this.placeService.getTrending();
  }
}
