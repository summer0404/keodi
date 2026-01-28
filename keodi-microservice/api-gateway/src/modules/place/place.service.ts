/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NearMePlacesResponseDto, NearMeQueryDto } from 'src/common/dtos/place.dto';

@Injectable()
export class PlaceService {
    constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

    async getNearbyPlaces(query: NearMeQueryDto): Promise<NearMePlacesResponseDto> {
        return await firstValueFrom(
            this.client.send('place.near-me', {
                latitude: query.latitude,
                longitude: query.longitude,
                radius: query.radius || 5,
                page: query.page || 1,
                limit: query.limit || 20,
                sortBy: query.sortBy || 'distance',
                sortOrder: query.sortOrder || 'asc',
            })
        );
    }

    async getPlaceById(id: string) {
        return await firstValueFrom(this.client.send('place.get-by-id', { id }));
    }
}
