import { Controller, Get, Param } from '@nestjs/common';
import { PlaceService } from './place.service';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { ApiOperation } from '@nestjs/swagger';

@Controller('place')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}


  @Get(':id')
  @ApiOperation({ description: 'Get place by id' })
  async getPlaceById(@Param('id') id: string) {
    return await this.placeService.getPlaceById(id);
  }
}
