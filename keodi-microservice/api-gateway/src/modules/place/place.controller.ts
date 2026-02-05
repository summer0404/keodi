/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation
} from '@nestjs/swagger';
import {
  NearMePlacesResponseDto,
  NearMeQueryDto
} from 'src/common/dtos/place.dto';
import { PlaceService } from './place.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/common/dtos/user.dto';

@Controller('places')
@ApiBearerAuth('access-token')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Get('near-me')
  @ApiOperation({ summary: 'Get places near user location'})
  @ApiOkResponse({ description: 'List of nearby places', type: NearMePlacesResponseDto })
  async getNearbyPlaces(
    @CurrentUser() user: CurrentUserDto, 
    @Query() query: NearMeQueryDto): Promise<NearMePlacesResponseDto> {
    return await this.placeService.getNearbyPlaces(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ description: 'Get place by id' })
  async getPlaceById(
    @CurrentUser() user: CurrentUserDto, 
    @Param('id') id: string) {
    return await this.placeService.getPlaceById(id, user.id);
  }
}
