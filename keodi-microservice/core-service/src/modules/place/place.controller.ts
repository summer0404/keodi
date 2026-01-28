/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
import { PlaceService } from './place.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

interface NearMePayload {
  latitude: number;
  longitude: number;
  radius: number;
  page: number;
  limit: number;
}

@Controller('place')
export class PlaceController {
    constructor(private readonly placeService: PlaceService) { }

    @MessagePattern('place.near-me')
    async getNearbyPlaces(@Payload() data: NearMePayload) {
        return await this.placeService.findNearby(
            data.latitude,
            data.longitude,
            data.radius,
            data.page,
            data.limit
        );
    }

    @MessagePattern('place.get-by-id')
    async get(@Payload() data: { id: string }) {
        return await this.placeService.getById(data.id);
    }
}
