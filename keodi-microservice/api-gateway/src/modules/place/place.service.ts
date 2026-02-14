/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PaginationConstants } from 'src/common/constants/pagination.constants';
import { PlaceConstants } from 'src/common/constants/place.constant';
import { NearMePlacesResponseDto, NearMeQueryDto, PlaceDistanceDto, SearchDto } from 'src/common/dtos/place.dto';
import { SortBy, SortOrder } from 'src/common/enums/sort.enum';

@Injectable()
export class PlaceService {
    constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) { }

    async getNearbyPlaces(query: NearMeQueryDto, userId: string): Promise<NearMePlacesResponseDto> {
        return await firstValueFrom(
            this.client.send('place.near-me', {
                latitude: query.latitude,
                longitude: query.longitude,
                radius: query.radius || PlaceConstants.DEFAULT_RADIUS,
                page: query.page || PaginationConstants.DEFAULT_PAGE,
                limit: query.limit || PaginationConstants.DEFAULT_LIMIT,
                sortBy: query.sortBy || SortBy.DISTANCE,
                sortOrder: query.sortOrder || SortOrder.ASC,
                userId,
            })
        );
    }

    async search(
        query: SearchDto,
        userId: string
    ): Promise<NearMePlacesResponseDto> {
        return await firstValueFrom(
            this.client.send('place.search', {
                ...query,
                userId,
            })
        );
    }

    async getPlaceById(id: string, userId: string): Promise<PlaceDistanceDto> {
        return await firstValueFrom(this.client.send('place.get-by-id', { id, userId }));
    }
}
