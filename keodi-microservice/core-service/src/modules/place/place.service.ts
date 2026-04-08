import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { GeoConstants } from 'src/shared/constants/place.constant';
import { NearMeDto, SearchDto } from 'src/shared/dtos/place.dto';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import {
  PlaceDetailResponse,
  PlacePaginatedResponse,
  PlaceWithDistance,
  RawPlace,
} from 'src/shared/interfaces/place.interface';
import { ImageService } from '../image/image.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { IntelligenceTopics, SearchTopics } from 'src/shared/constants/topic.constant';
import { VECTOR_SIMILARITY_THRESHOLD } from 'src/shared/constants/search.constant';

@Injectable()
export class PlaceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly imageService: ImageService,
    private readonly kafkaService: KafkaService,
  ) { }

  private calculateGeoDeltas(latitude: number, radius: number) {
    const latDelta = radius / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE;
    const longDelta =
      radius /
      (GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE *
        Math.cos((latitude * Math.PI) / GeoConstants.DEGREES_IN_HALF_CIRCLE));
    return { latDelta, longDelta };
  }

  private buildPaginationParams(
    page: number,
    limit: number,
    sortBy: PlaceSortBy,
    sortOrder: SortOrder,
  ) {
    const allowedSortBy: string[] = Object.values(PlaceSortBy);
    const allowedSortOrder: string[] = Object.values(SortOrder);

    if (!allowedSortBy.includes(sortBy)) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `Invalid sortBy value`,
      });
    }
    if (!allowedSortOrder.includes(sortOrder)) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `Invalid sortOrder value`,
      });
    }

    const offset = (page - 1) * limit;
    const order = sortOrder.toUpperCase();
    const orderByClause = `ORDER BY ${sortBy} ${order}`;
    return { offset, orderByClause };
  }

  private buildVectorSearchCondition(embedding?: number[]) {
    if (!embedding || embedding.length === 0) {
      return Prisma.empty;
    }
    const vectorStr = `[${embedding.join(',')}]`;
    return Prisma.sql`
            AND p.embedding_title IS NOT NULL
            AND (
                0.65 * (1 - (p.embedding_title <=> CAST(${vectorStr} AS vector)))
                + 0.35 * COALESCE((1 - (p.embedding_full <=> CAST(${vectorStr} AS vector))), 0)
            ) >= ${VECTOR_SIMILARITY_THRESHOLD}
        `;
  }

  private async enrichPlacesWithFavoriteAndImage(
    rawPlaces: (RawPlace & { distance: number })[],
    userId: string,
  ): Promise<PlaceWithDistance[]> {
    const placeIds = rawPlaces.map((p) => p.id);

    const placesWithRelations = await this.prismaService.place.findMany({
      where: { id: { in: placeIds } },
      include: {
        favorites: {
          where: { userId },
          select: { userId: true },
        },
        openingHours: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
        placeCategories: {
          select: {
            isMain: true,
            category: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const relationsMap = new Map(placesWithRelations.map((p) => [p.id, p]));

    return await Promise.all(
      rawPlaces.map(async (place) => {
        const relations = relationsMap.get(place.id);

        return {
          ...place,
          isFavorite:
            (relations?.favorites && relations.favorites.length > 0) ?? false,
          featureImageUrl: place.featureImageUrl
            ? await this.imageService.getImageViewUrl(place.featureImageUrl)
            : null,
          openingHours: relations?.openingHours ?? [],
          categories:
            relations?.placeCategories.map((pc) => ({
              id: pc.category.id,
              name: pc.category.name,
              isMain: pc.isMain,
            })) ?? [],
        };
      }),
    );
  }

  private async queryPlacesInRadiusWithDistance(
    latitude: number,
    longitude: number,
    latDelta: number,
    longDelta: number,
    radius: number,
    orderByClause: string,
    limit: number,
    offset: number,
    embedding?: number[],
  ): Promise<(RawPlace & { distance: number; similarity_score?: number })[]> {
    const vectorCondition = this.buildVectorSearchCondition(embedding);
    const hasEmbedding = embedding && embedding.length > 0;
    
    const searchOrderBy = hasEmbedding 
      ? 'ORDER BY similarity_score DESC, distance ASC' 
      : orderByClause;

    const vectorStr = hasEmbedding ? `[${embedding.join(',')}]` : null;
    const similarityColumn = vectorStr ? Prisma.sql`,
                    (
                        0.65 * (1 - (p.embedding_title <=> CAST(${vectorStr} AS vector)))
                        + 0.35 * COALESCE((1 - (p.embedding_full <=> CAST(${vectorStr} AS vector))), 0)
                    ) AS similarity_score` : Prisma.sql`, NULL AS similarity_score`;

    return await this.prismaService.$queryRaw<
      (RawPlace & { distance: number; similarity_score?: number })[]
    >`
            SELECT * FROM (
                SELECT
                    p.id,
                    p.from_google as "fromGoogle",
                    p.name,
                    p.description,
                    p.rating,
                    p.google_map_link as "googleMapLink",
                    p.website,
                    p.phone_number as "phoneNumber",
                    p.feature_image_url as "featureImageUrl",
                    p.owner_id as "ownerId",
                    p.latitude,
                    p.longitude,
                    p.full_address as "fullAddress",
                    p.ward,
                    p.street,
                    p.city,
                    p.country_code as "countryCode",
                    p.created_at as "createdAt",
                    p.updated_at as "updatedAt",
                    (
                        ${GeoConstants.EARTH_RADIUS_IN_KILOMETERS} * acos(LEAST(1, GREATEST(-1,
                            cos(radians(${latitude})) 
                            * cos(radians(p.latitude)) 
                            * cos(radians(p.longitude) - radians(${longitude})) 
                            + sin(radians(${latitude})) 
                            * sin(radians(p.latitude))
                        )))
                    ) AS distance
                    ${similarityColumn}
                FROM places p
                WHERE p.latitude BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}
                    AND p.longitude BETWEEN ${longitude - longDelta} AND ${longitude + longDelta}
                    ${vectorCondition}
            ) AS places_with_distance
            WHERE distance <= ${radius}
            ${Prisma.raw(searchOrderBy)}
            LIMIT ${limit}
            OFFSET ${offset}
        `;
  }

  private async countPlacesInRadius(
    latitude: number,
    longitude: number,
    latDelta: number,
    longDelta: number,
    radius: number,
    embedding?: number[],
  ): Promise<number> {
    const vectorCondition = this.buildVectorSearchCondition(embedding);

    const totalResult = await this.prismaService.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count
            FROM (
                SELECT 
                    (
                        ${GeoConstants.EARTH_RADIUS_IN_KILOMETERS} * acos(LEAST(1, GREATEST(-1,
                            cos(radians(${latitude})) 
                            * cos(radians(p.latitude)) 
                            * cos(radians(p.longitude) - radians(${longitude})) 
                            + sin(radians(${latitude})) 
                            * sin(radians(p.latitude))
                        )))
                    ) AS distance
                FROM places p
                WHERE p.latitude BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}
                    AND p.longitude BETWEEN ${longitude - longDelta} AND ${longitude + longDelta}
                    ${vectorCondition}
            ) as places_with_distance
            WHERE distance <= ${radius}
        `;

    return Number(totalResult[0].count);
  }

  async findNearby(nearMeDto: NearMeDto): Promise<PlacePaginatedResponse> {
    const {
      latitude,
      longitude,
      radius,
      page,
      limit,
      sortBy,
      sortOrder,
      userId,
    } = nearMeDto;

    const { latDelta, longDelta } = this.calculateGeoDeltas(latitude, radius);

    const { offset, orderByClause } = this.buildPaginationParams(
      page,
      limit,
      sortBy,
      sortOrder,
    );

    try {
      const [rawPlaces, total] = await Promise.all([
        this.queryPlacesInRadiusWithDistance(
          latitude,
          longitude,
          latDelta,
          longDelta,
          radius,
          orderByClause,
          limit,
          offset,
        ),
        this.countPlacesInRadius(
          latitude,
          longitude,
          latDelta,
          longDelta,
          radius,
        ),
      ]);

      const places = await this.enrichPlacesWithFavoriteAndImage(
        rawPlaces,
        userId,
      );
      const totalPages = Math.ceil(total / limit);

      return {
        places,
        total,
        page,
        totalPages,
        limit,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async search(searchDto: SearchDto): Promise<PlacePaginatedResponse> {
    const {
      search,
      userId,
      latitude,
      longitude,
      radius,
      limit,
      page,
      sortBy,
      sortOrder,
    } = searchDto;

    const { latDelta, longDelta } = this.calculateGeoDeltas(latitude, radius);

    const { offset, orderByClause } = this.buildPaginationParams(
      page,
      limit,
      sortBy,
      sortOrder,
    );

    try {
      let extractedIntent: {
        keywords?: string;
        embedding?: number[];
      } = {};

      try {
        extractedIntent = await this.kafkaService.sendWithTimeout(
          IntelligenceTopics.ExtractUserIntent,
          { search },
        );
      } catch (error: any) {
        if (error?.message?.includes('EMBEDDING_FAILED')) {
          throw new RpcException({
            status: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Embedding service is unavailable',
          });
        }
      }

      this.kafkaService.getClient().emit(SearchTopics.Create, {
        userId,
        rawQuery: search,
        extractedTerm: extractedIntent.keywords,
      });
      
      const [rawPlaces, total] = await Promise.all([
        this.queryPlacesInRadiusWithDistance(
          latitude,
          longitude,
          latDelta,
          longDelta,
          radius,
          orderByClause,
          limit,
          offset,
          extractedIntent.embedding,
        ),
        this.countPlacesInRadius(
          latitude,
          longitude,
          latDelta,
          longDelta,
          radius,
          extractedIntent.embedding,
        ),
      ]);

      const places = await this.enrichPlacesWithFavoriteAndImage(
        rawPlaces,
        userId,
      );
      const totalPages = Math.ceil(total / limit);

      return {
        places,
        total,
        page,
        totalPages,
        limit,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getById(id: string, userId: string): Promise<PlaceDetailResponse> {
    try {
      const place = await this.prismaService.place.findUnique({
        where: { id },
        include: {
          favorites: {
            where: { userId },
            select: { userId: true },
          },
          openingHours: {
            select: {
              dayOfWeek: true,
              openTime: true,
              closeTime: true,
            },
            orderBy: { dayOfWeek: SortOrder.ASC },
          },
          placeCategories: {
            select: {
              isMain: true,
              category: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!place) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Place not found`,
        });
      }

      const { favorites, placeCategories, ...placeData } = place;

      return {
        ...placeData,
        isFavorite: favorites.length > 0,
        featureImageUrl: placeData.featureImageUrl
          ? await this.imageService.getImageViewUrl(placeData.featureImageUrl)
          : null,
        openingHours: placeData.openingHours,
        categories: placeCategories.map((pc) => ({
          id: pc.category.id,
          name: pc.category.name,
          isMain: pc.isMain,
        })),
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updatePlaceRating(placeId: string, prisma?: Prisma.TransactionClient) {
    try {
      await (prisma || this.prismaService).$executeRaw`
                UPDATE places 
                SET rating = COALESCE((
                    SELECT AVG(rating) 
                    FROM reviews 
                    WHERE place_id = ${placeId}
                ), 0)
                WHERE id = ${placeId}
            `;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
