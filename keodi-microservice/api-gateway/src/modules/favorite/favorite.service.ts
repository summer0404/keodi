import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  FavoriteResponseDto,
  FavoritesListResponseDto,
  IsFavoriteResponseDto,
} from 'src/shared/dtos/favorite.dto';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { UserAction } from 'src/shared/enums/user.enum';

@Injectable()
export class FavoriteService {
  constructor(private readonly kafkaService: KafkaService) {}

  async addFavorite(
    userId: string,
    placeId: string,
  ): Promise<FavoriteResponseDto> {
    this.kafkaService.getClient().emit('intelligence.user-action', {
      userId,
      placeId,
      action: UserAction.FAVORITE,
    });

    return await firstValueFrom(
      this.kafkaService.getClient().send('favorite.add', { userId, placeId }),
    );
  }

  async removeFavorite(
    userId: string,
    placeId: string,
  ): Promise<FavoriteResponseDto> {
    return await firstValueFrom(
      this.kafkaService.getClient().send('favorite.remove', { userId, placeId }),
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
      this.kafkaService.getClient().send('favorite.get-list', {
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
      this.kafkaService.getClient().send('favorite.check', { userId, placeId }),
    );
  }
}
