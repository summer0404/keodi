/* eslint-disable prettier/prettier */
import { 
  Controller, 
  Get, 
  Param, 
  Query 
} from '@nestjs/common';
import { PlaceService } from './place.service';
import { 
  ApiBearerAuth, 
  ApiOkResponse, 
  ApiOperation 
} from '@nestjs/swagger';
import { 
  NearMePlacesResponseDto, 
  NearMeQueryDto 
} from 'src/common/dtos/place.dto';

@Controller('places')
@ApiBearerAuth('access-token')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Get('near-me')
  @ApiOperation({ summary: 'Get places near user location'})
  @ApiOkResponse({ description: 'List of nearby places', type: NearMePlacesResponseDto })
  async getNearbyPlaces(@Query() query: NearMeQueryDto): Promise<NearMePlacesResponseDto> {
    return await this.placeService.getNearbyPlaces(query);
  }

  @Get(':id')
  @ApiOperation({ description: 'Get place by id' })
  async getPlaceById(@Param('id') id: string) {
    return await this.placeService.getPlaceById(id);
  }
}
