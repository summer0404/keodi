import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  FavoriteResponseDto,
  FavoritesListResponseDto,
  IsFavoriteResponseDto,
} from 'src/shared/dtos/favorite.dto';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { UserAction } from 'src/shared/enums/user.enum';
import { FavoriteTopics, IntelligenceTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class FavoriteService {
  constructor(private readonly kafkaService: KafkaService) {}

  async addFavorite(
    userId: string,
    placeId: string,
  ): Promise<FavoriteResponseDto> {
    this.kafkaService.getClient().emit(IntelligenceTopics.UserAction, {
      userId,
      placeId,
      action: UserAction.FAVORITE,
    });

    return await this.kafkaService.sendWithTimeout(FavoriteTopics.Add, { userId, placeId });
  }

  async removeFavorite(
    userId: string,
    placeId: string,
  ): Promise<FavoriteResponseDto> {
    return await this.kafkaService.sendWithTimeout(FavoriteTopics.Remove, { userId, placeId });
  }

  async getUserFavorites(
    userId: string,
    page: number,
    limit: number,
    sortBy?: PlaceSortBy,
    sortOrder?: SortOrder,
  ): Promise<FavoritesListResponseDto> {
    return await this.kafkaService.sendWithTimeout(FavoriteTopics.GetList, { userId, page, limit, sortBy, sortOrder });
  }

  async isFavorite(
    userId: string,
    placeId: string,
  ): Promise<IsFavoriteResponseDto> {
    return await this.kafkaService.sendWithTimeout(FavoriteTopics.Check, { userId, placeId });
  }
}
