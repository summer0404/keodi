/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/common/dtos/pagination.dto';
import { DEFAULT_RADIUS, NearMePlacesResponseDto, NearMeQueryDto } from 'src/common/dtos/place.dto';
import { SortBy, SortOrder } from 'src/common/enums/sort.enum';

@Injectable()
export class PlaceService {
    constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

    async getNearbyPlaces(query: NearMeQueryDto): Promise<NearMePlacesResponseDto> {
        return await firstValueFrom(
            this.client.send('place.near-me', {
                latitude: query.latitude,
                longitude: query.longitude,
                radius: query.radius || DEFAULT_RADIUS,
                page: query.page || DEFAULT_PAGE,
                limit: query.limit || DEFAULT_LIMIT,
                sortBy: query.sortBy || SortBy.DISTANCE,
                sortOrder: query.sortOrder || SortOrder.ASC,
            })
        );
    }

    async getPlaceById(id: string) {
        return await firstValueFrom(this.client.send('place.get-by-id', { id }));
    }
}
