import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FavoriteService {
  constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

  async addFavorite(userId: string, placeId: string) {
    return await firstValueFrom(
      this.client.send('favorite.add', { userId, placeId }),
    );
  }

  async removeFavorite(userId: string, placeId: string) {
    return await firstValueFrom(
      this.client.send('favorite.remove', { userId, placeId }),
    );
  }

  async getUserFavorites(userId: string, page: number, limit: number) {
    return await firstValueFrom(
      this.client.send('favorite.get-list', { userId, page, limit }),
    );
  }

  async isFavorite(userId: string, placeId: string) {
    return await firstValueFrom(
      this.client.send('favorite.check', { userId, placeId }),
    );
  }
}
