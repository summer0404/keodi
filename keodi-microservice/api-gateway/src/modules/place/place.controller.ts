/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags
} from '@nestjs/swagger';
import {
  NearMePlacesResponseDto,
  NearMeQueryDto,
  SearchDto
} from 'src/common/dtos/place.dto';
import { PlaceService } from './place.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/common/dtos/user.dto';
import { ApiGetPlaceById, ApiNearMePlace, ApiSearchPlace } from './place.swagger';

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
    @Query() query: SearchDto) {
    return await this.placeService.search(query, user.id);
  }

  @Get(':id')
  @ApiGetPlaceById()
  async getPlaceById(
    @CurrentUser() user: CurrentUserDto, 
    @Param('id') id: string) {
    return await this.placeService.getPlaceById(id, user.id);
  }
}
