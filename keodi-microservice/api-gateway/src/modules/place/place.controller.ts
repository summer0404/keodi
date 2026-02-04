/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Param,
  Query,
  Req,
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
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PlaceService } from './place.service';

@Controller('places')
@ApiBearerAuth('access-token')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Get('near-me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get places near user location'})
  @ApiOkResponse({ description: 'List of nearby places', type: NearMePlacesResponseDto })
  async getNearbyPlaces(@Req() req, @Query() query: NearMeQueryDto): Promise<NearMePlacesResponseDto> {
    const userId = req.user?.id;
    return await this.placeService.getNearbyPlaces(query, userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: 'Get place by id' })
  async getPlaceById(@Req() req, @Param('id') id: string) {
    const userId = req.user?.id;
    return await this.placeService.getPlaceById(id, userId);
  }
}
