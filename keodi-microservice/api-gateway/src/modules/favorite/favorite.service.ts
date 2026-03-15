import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  FavoriteResponseDto,
  FavoritesListResponseDto,
  IsFavoriteResponseDto,
} from 'src/shared/dtos/favorite.dto';
import { PlaceSortBy, SortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { UserAction } from 'src/shared/enums/user.enum';

@Injectable()
export class FavoriteService {
  constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

  async addFavorite(
    userId: string,
    placeId: string,
  ): Promise<FavoriteResponseDto> {
    this.client.emit('intelligence.user-action', {
      userId,
      placeId,
      action: UserAction.FAVORITE,
    });

    return await firstValueFrom(
      this.client.send('favorite.add', { userId, placeId }),
    );
  }

  async removeFavorite(
    userId: string,
    placeId: string,
  ): Promise<FavoriteResponseDto> {
    return await firstValueFrom(
      this.client.send('favorite.remove', { userId, placeId }),
    );
  }

  async getUserFavorites(
    userId: string,
    page: number,
    limit: number,
    sortBy?: PlaceSortBy,
    sortOrder?: SortOrder,
  ): Promise<FavoritesListResponseDto> {
    return await firstValueFrom(
      this.client.send('favorite.get-list', {
        userId,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
    );
  }

  async isFavorite(
    userId: string,
    placeId: string,
  ): Promise<IsFavoriteResponseDto> {
    return await firstValueFrom(
      this.client.send('favorite.check', { userId, placeId }),
    );
  }
}
