/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PlaceService } from './place.service';
import { CreatePlaceDto, NearMeDto, SearchDto, UpdatePlaceDto } from 'src/shared/dtos/place.dto';
import { PlaceTopics } from 'src/shared/constants/topic.constant';

@Controller('place')
export class PlaceController {
    constructor(private readonly placeService: PlaceService) { }

    @MessagePattern(PlaceTopics.Create)
    async create(@Payload() data: CreatePlaceDto) {
        return await this.placeService.create(data);
    }

    @MessagePattern(PlaceTopics.NearMe)
    async getNearbyPlaces(@Payload() data: NearMeDto) {
        return await this.placeService.findNearby(data);
    }

    @MessagePattern(PlaceTopics.Search)
    async search(@Payload() data: SearchDto) {
        return await this.placeService.search(data);
    }

    @MessagePattern(PlaceTopics.GetById)
    async get(@Payload() data: { id: string; userId: string }) {
        return await this.placeService.getById(data.id, data.userId);
    }

    @MessagePattern(PlaceTopics.Update)
    async update(@Payload() data: UpdatePlaceDto) {
        return await this.placeService.update(data);
    }
}
