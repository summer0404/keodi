import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PlaceImageType, PlaceStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { PlaceErrorMessages } from 'src/shared/constants/error.constant';
import { GeoConstants } from 'src/shared/constants/place.constant';
import {
  CreatePlaceDto,
  NearMeDto,
  SearchDto,
} from 'src/shared/dtos/place.dto';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';
import { formatTimeOnly } from 'src/shared/utils/time.helper';
import {
  PlaceDetailResponse,
  PlacePaginatedResponse,
  PlaceWithDistance,
  RawPlace,
} from 'src/shared/interfaces/place.interface';
import { ImageService } from '../image/image.service';
import {
  IntelligenceTopics,
  SearchTopics,
} from 'src/shared/constants/topic.constant';
import {
  LLM_THINKING_TAG,
  VECTOR_SIMILARITY_THRESHOLD,
} from 'src/shared/constants/search.constant';
import {
  ExtractedIntent,
  SearchQueryConfig,
} from 'src/shared/types/search.type';
import { PlaceHelper } from './place.helper';

@Injectable()
export class PlaceService {
  private readonly logger = new Logger(PlaceService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly imageService: ImageService,
    private readonly kafkaService: KafkaService,
    private readonly placeHelper: PlaceHelper,
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
        message: PlaceErrorMessages.INVALID_SORT_BY,
      });
    }
    if (!allowedSortOrder.includes(sortOrder)) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: PlaceErrorMessages.INVALID_SORT_ORDER,
      });
    }

    const offset = (page - 1) * limit;
    const order = sortOrder.toUpperCase();
    const orderByClause = `ORDER BY ${sortBy} ${order}`;
    return { offset, orderByClause };
  }

  private buildEmbeddingSearchCondition(embedding?: number[]) {
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

  private buildKeywordSearchCondition(keywords?: string) {
    if (!keywords?.trim()) {
      return Prisma.empty;
    }

    return Prisma.sql`
            AND p.fts_search_vector @@ websearch_to_tsquery('simple', f_unaccent(${keywords}))
        `;
  }

  private buildSearchCondition(embedding?: number[], keywords?: string) {
    if (keywords?.trim()) {
      return this.buildKeywordSearchCondition(keywords);
    }

    return this.buildEmbeddingSearchCondition(embedding);
  }

  private buildEmbeddingQueryConfig(
    embedding: number[] | undefined,
    orderByClause: string,
  ): SearchQueryConfig {
    const hasEmbedding = embedding && embedding.length > 0;
    const searchOrderBy = hasEmbedding
      ? 'ORDER BY similarity_score DESC, distance ASC'
      : orderByClause;

    const vectorStr = hasEmbedding ? `[${embedding.join(',')}]` : null;
    const similarityColumn = vectorStr
      ? Prisma.sql`,
                    (
                        0.65 * (1 - (p.embedding_title <=> CAST(${vectorStr} AS vector)))
                        + 0.35 * COALESCE((1 - (p.embedding_full <=> CAST(${vectorStr} AS vector))), 0)
                    ) AS similarity_score`
      : Prisma.sql`, NULL AS similarity_score`;

    return {
      searchCondition: this.buildEmbeddingSearchCondition(embedding),
      similarityColumn,
      searchOrderBy,
    };
  }

  private buildKeywordQueryConfig(keywords: string): SearchQueryConfig {
    const keywordRank = Prisma.sql`,
                    ts_rank_cd(
                        p.fts_search_vector,
                        websearch_to_tsquery('simple', f_unaccent(${keywords}))
                    ) AS similarity_score`;

    return {
      searchCondition: this.buildKeywordSearchCondition(keywords),
      similarityColumn: keywordRank,
      searchOrderBy: 'ORDER BY similarity_score DESC, distance ASC',
    };
  }

  private buildSearchQueryConfig(
    embedding: number[] | undefined,
    keywords: string | undefined,
    orderByClause: string,
  ): SearchQueryConfig {
    if (keywords?.trim()) {
      return this.buildKeywordQueryConfig(keywords);
    }

    return this.buildEmbeddingQueryConfig(embedding, orderByClause);
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
          openingHours:
            relations?.openingHours.map((oh) => ({
              ...oh,
              openTime: oh.openTime ? formatTimeOnly(oh.openTime) : null,
              closeTime: oh.closeTime ? formatTimeOnly(oh.closeTime) : null,
            })) ?? [],
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
    keywords?: string,
  ): Promise<(RawPlace & { distance: number; similarity_score?: number })[]> {
    const { searchCondition, similarityColumn, searchOrderBy } =
      this.buildSearchQueryConfig(embedding, keywords, orderByClause);

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
                    AND p.status = 'PUBLISHED'::"PlaceStatus"
                  ${searchCondition}
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
    keywords?: string,
  ): Promise<number> {
    const searchCondition = this.buildSearchCondition(embedding, keywords);

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
                    AND p.status = 'PUBLISHED'::"PlaceStatus"
                  ${searchCondition}
            ) as places_with_distance
            WHERE distance <= ${radius}
        `;

    return Number(totalResult[0].count);
  }

  private async queryPlacesByIntent(params: {
    latitude: number;
    longitude: number;
    latDelta: number;
    longDelta: number;
    radius: number;
    orderByClause: string;
    limit: number;
    offset: number;
    extractedIntent: ExtractedIntent;
  }): Promise<
    [(RawPlace & { distance: number; similarity_score?: number })[], number]
  > {
    const {
      latitude,
      longitude,
      latDelta,
      longDelta,
      radius,
      orderByClause,
      limit,
      offset,
      extractedIntent,
    } = params;

    return Promise.all([
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
        extractedIntent.keywords,
      ),
      this.countPlacesInRadius(
        latitude,
        longitude,
        latDelta,
        longDelta,
        radius,
        extractedIntent.embedding,
        extractedIntent.keywords,
      ),
    ]);
  }

  async create(createPlaceDto: CreatePlaceDto) {
    try {
      const mainCategoryId = createPlaceDto.mainCategoryId.trim();
      const street = createPlaceDto.street.trim();
      const ward = createPlaceDto.ward.trim();
      const city = createPlaceDto.city.trim();
      const countryCode = this.placeHelper.normalizeCountryCode(
        createPlaceDto.countryCode,
      );
      const categoryIds = Array.from(
        new Set(
          [
            mainCategoryId,
            ...(createPlaceDto.secondaryCategoryIds ?? []).map((id) =>
              id.trim(),
            ),
          ].filter((id) => !!id),
        ),
      );
      const attributeIds = Array.from(
        new Set(
          (createPlaceDto.attributeIds ?? [])
            .map((id) => id.trim())
            .filter((id) => !!id),
        ),
      );

      if (!createPlaceDto.featureImage) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.PLACE_IMAGE_REQUIRED,
        });
      }

      const featureImage = await this.imageService.uploadImage(
        this.placeHelper.buildPlaceImageKey(createPlaceDto.featureImageType),
        createPlaceDto.featureImage,
        createPlaceDto.featureImageType,
      );
      const openingHours = this.placeHelper.normalizeOpeningHours(
        createPlaceDto.openingHours,
      );

      const [existingCategories, existingAttributes] = await Promise.all([
        this.prismaService.category.findMany({
          where: {
            id: { in: categoryIds },
          },
          select: { id: true },
        }),
        attributeIds.length > 0
          ? this.prismaService.attribute.findMany({
            where: {
              id: { in: attributeIds },
            },
            select: { id: true },
          })
          : Promise.resolve([]),
      ]);

      if (existingCategories.length !== categoryIds.length) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.PLACE_CATEGORY_NOT_FOUND,
        });
      }

      if (existingAttributes.length !== attributeIds.length) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.PLACE_ATTRIBUTE_NOT_FOUND,
        });
      }

      const createdPlace = await this.prismaService.place.create({
        data: {
          fromGoogle: false,
          status: PlaceStatus.UNDER_REVIEW,
          name: createPlaceDto.name.trim(),
          description: this.placeHelper.trimToNull(createPlaceDto.description),
          rating: 0,
          googleMapLink: this.placeHelper.toGoogleMapLink(
            createPlaceDto.latitude,
            createPlaceDto.longitude,
          ),
          website: this.placeHelper.trimToNull(createPlaceDto.website),
          phoneNumber: this.placeHelper.trimToNull(createPlaceDto.phoneNumber),
          featureImageUrl: featureImage.key,
          ownerId: createPlaceDto.ownerId,
          latitude: createPlaceDto.latitude,
          longitude: createPlaceDto.longitude,
          fullAddress: this.placeHelper.buildFullAddress(
            street,
            ward,
            city,
            countryCode,
          ),
          street,
          ward,
          city,
          countryCode,
          placeCategories: {
            create: categoryIds.map((categoryId) => ({
              categoryId,
              isMain: categoryId === mainCategoryId,
            })),
          },
          placeAttributes:
            attributeIds.length > 0
              ? {
                create: attributeIds.map((attributeId) => ({
                  attributeId,
                })),
              }
              : undefined,
          openingHours:
            openingHours.length > 0
              ? {
                create: openingHours,
              }
              : undefined,
          placeImages: {
            create: {
              type: PlaceImageType.FEATURE,
              imageId: featureImage.id,
            },
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      return {
        message: 'Place created successfully and sent for review',
        placeId: createdPlace.id,
        status: createdPlace.status,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
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
      let extractedIntent: ExtractedIntent = {};

      try {
        extractedIntent = await this.kafkaService.sendWithTimeout(
          IntelligenceTopics.ExtractUserIntent,
          { search },
        );
      } catch (error: any) {
        const errorMessage =
          error?.message ?? 'Unknown error when extracting user intent';
        this.logger.warn(
          `ExtractUserIntent failed. Falling back to empty intent. reason=${errorMessage}`,
        );

        if (error?.message?.includes('EMBEDDING_FAILED')) {
          throw new RpcException({
            status: HttpStatus.SERVICE_UNAVAILABLE,
            message: PlaceErrorMessages.EMBEDDING_SERVICE_UNAVAILABLE,
          });
        }
      }

      if (extractedIntent.keywords?.includes(LLM_THINKING_TAG)) {
        this.logger.warn(
          `Extracted keywords contain llm thinking step. Falling back to using embedding`,
        );
        extractedIntent.keywords = undefined;
      }

      this.kafkaService.getClient().emit(SearchTopics.Create, {
        userId,
        rawQuery: search,
        extractedTerm: extractedIntent.keywords,
      });

      const [rawPlaces, total] = await this.queryPlacesByIntent({
        latitude,
        longitude,
        latDelta,
        longDelta,
        radius,
        orderByClause,
        limit,
        offset,
        extractedIntent,
      });

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
      const place = await this.prismaService.place.findFirst({
        where: {
          id,
          status: PlaceStatus.PUBLISHED,
        },
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
          message: PlaceErrorMessages.PLACE_NOT_FOUND,
        });
      }

      const { favorites, placeCategories, ...placeData } = place;

      return {
        ...placeData,
        isFavorite: favorites.length > 0,
        featureImageUrl: placeData.featureImageUrl
          ? await this.imageService.getImageViewUrl(placeData.featureImageUrl)
          : null,
        openingHours: placeData.openingHours.map((oh) => ({
          ...oh,
          openTime: oh.openTime ? formatTimeOnly(oh.openTime) : null,
          closeTime: oh.closeTime ? formatTimeOnly(oh.closeTime) : null,
        })),
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
