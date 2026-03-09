/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PlaceService } from './place.service';
import { NearMeDto, SearchDto } from 'src/common/dtos/place.dto';

@Controller('place')
export class PlaceController {
    constructor(private readonly placeService: PlaceService) { }

    @MessagePattern('place.near-me')
    async getNearbyPlaces(@Payload() data: NearMeDto) {
        return await this.placeService.findNearby(data);
    }

    @MessagePattern('place.search')
    async search(@Payload() data: SearchDto) {
        return await this.placeService.search(data);
    }

    @MessagePattern('place.get-by-id')
    async get(@Payload() data: { id: string; userId: string }) {
        return await this.placeService.getById(data.id, data.userId);
    }
}
