/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SortBy, SortOrder } from 'src/common/enums/sort.enum';
import { PlaceService } from './place.service';

interface NearMePayload {
  latitude: number;
  longitude: number;
  radius: number;
  page: number;
  limit: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  userId: string;
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
            data.limit,
            data.sortBy,
            data.sortOrder,
            data.userId
        );
    }

    @MessagePattern('place.get-by-id')
    async get(@Payload() data: { id: string; userId: string }) {
        return await this.placeService.getById(data.id, data.userId);
    }
}
