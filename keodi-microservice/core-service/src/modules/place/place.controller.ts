/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PlaceService } from './place.service';
import { CreatePlaceDto, NearMeDto, SearchDto, UpdatePlaceDto } from 'src/shared/dtos/place.dto';
import { GetAdminPlacesDto, RejectPlaceDto } from 'src/shared/dtos/admin-place.dto';
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

    @MessagePattern(PlaceTopics.GetAllAdmin)
    async getAllAdmin(@Payload() data: GetAdminPlacesDto) {
        return await this.placeService.getAllAdmin(data);
    }

    @MessagePattern(PlaceTopics.Approve)
    async approve(@Payload() data: { placeId: string }) {
        return await this.placeService.approvePlace(data.placeId);
    }

    @MessagePattern(PlaceTopics.Reject)
    async reject(@Payload() data: { placeId: string; data: RejectPlaceDto }) {
        return await this.placeService.rejectPlace(data.placeId, data.data.reason);
    }

    @MessagePattern(PlaceTopics.GetByIdsWithDistance)
    async getByIdsWithDistance(
        @Payload() data: { ids: string[]; userId: string; latitude: number; longitude: number },
    ) {
        return await this.placeService.getByIdsWithDistance(data.ids, data.userId, data.latitude, data.longitude);
    }

    @MessagePattern(PlaceTopics.Update)
    async update(@Payload() data: UpdatePlaceDto) {
        return await this.placeService.update(data);
    }
}
