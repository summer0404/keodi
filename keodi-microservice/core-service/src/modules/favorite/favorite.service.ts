import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  FavoritePlacesPaginationDto,
  UserCommonPaginationDto,
} from 'src/shared/dtos/user.dto';
import { PlaceSortBy, SortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';
import { PrismaService } from 'src/database/prisma.service';
import {
  FavoriteErrorMessages,
  PlaceErrorMessages,
} from 'src/shared/constants/error.constant';

@Injectable()
export class FavoriteService {
  constructor(private readonly prismaService: PrismaService) {}

  async addFavorite(userId: string, placeId: string) {
    try {
      const place = await this.prismaService.place.findUnique({
        where: { id: placeId },
      });

      if (!place) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: PlaceErrorMessages.PLACE_NOT_FOUND,
        });
      }

      const existing = await this.prismaService.favorite.findUnique({
        where: {
          userId_placeId: { userId, placeId },
        },
      });

      if (existing) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: FavoriteErrorMessages.PLACE_ALREADY_IN_FAVORITES,
        });
      }

      return await this.prismaService.favorite.create({
        data: { userId, placeId },
      });
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async removeFavorite(userId: string, placeId: string) {
    try {
      const favorite = await this.prismaService.favorite.findUnique({
        where: {
          userId_placeId: { userId, placeId },
        },
      });

      if (!favorite) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: FavoriteErrorMessages.FAVORITE_NOT_FOUND,
        });
      }
      return await this.prismaService.favorite.delete({
        where: {
          userId_placeId: { userId, placeId },
        },
      });
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getUserFavorites(
    favoritePlacesPaginationDto: FavoritePlacesPaginationDto,
  ) {
    const { userId, page, limit, sortBy, sortOrder } =
      favoritePlacesPaginationDto;

    try {
      const offset = (page - 1) * limit;
      const order = sortOrder.toLowerCase() as SortOrder;

      const orderByMap = {
        [PlaceSortBy.NAME]: { place: { name: order } },
        [PlaceSortBy.RATING]: { place: { rating: order } },
        [PlaceSortBy.CREATED_AT]: { createdAt: order },
      };

      const orderBy = orderByMap[sortBy] || { createdAt: order };

      const [favorites, total] = await Promise.all([
        this.prismaService.favorite.findMany({
          where: { userId },
          include: {
            place: true,
          },
          skip: offset,
          take: limit,
          orderBy,
        }),
        this.prismaService.favorite.count({
          where: { userId },
        }),
      ]);

      return {
        favorites: favorites.map((f) => f.place),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async isFavorite(userId: string, placeId: string) {
    try {
      const favorite = await this.prismaService.favorite.findUnique({
        where: {
          userId_placeId: { userId, placeId },
        },
      });

      return { isFavorite: !!favorite };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
