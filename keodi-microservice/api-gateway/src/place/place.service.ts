import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PlaceService {
    constructor(@Inject('CORE_SERVICE') private readonly client: ClientKafka) {}

    async getPlaceById(id: string) {
        return await firstValueFrom(this.client.send('place.get-by-id', { id }));
    }
}
