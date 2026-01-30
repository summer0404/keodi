import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';

@Injectable()
export class CategoryService {
    constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

    async getListOnBoarding() {
        return await firstValueFrom(this.client.send('category.get-list-onboarding', {}));
    }
}
