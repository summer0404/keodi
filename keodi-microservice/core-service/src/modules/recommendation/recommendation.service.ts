import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { RedisService } from 'src/providers/redis/redis.service';
import { GeoConstants } from 'src/shared/constants/place.constant';
import {
  MAX_CANDINDATE_PLACES,
  MAX_RECOMMENDATIONS_BOUNDING_KM,
  PLACES_PER_SEARCH_TERM,
  TIME_DECAY,
} from 'src/shared/constants/recommendation.constant';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';
import { RecommendationHelper } from './recommendation.helper';
// import { SEARCH_TRENDING_TTL_SECONDS } from 'src/shared/constants/search.constant';
import { GroupSessionStatus, Prisma, UserActionType } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  GROUP_SESSION_MAX_RECOMMENDATION_PLACES,
  GROUP_SESSION_RECOMMENDATION_MIN_MEMBERS,
  GROUP_SESSION_RECOMMENDATION_TTL_SECONDS,
  GroupSessionMessages,
} from 'src/shared/constants/group-session.constant';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import { MAX_RECENT_SEARCHES_PER_USER } from 'src/shared/constants/search.constant';
import { IntelligenceTopics } from 'src/shared/constants/topic.constant';
import {
  PlaceRecommendationResponseDto,
  RecommendationPlaceRow,
} from 'src/shared/dtos/recommendation.dto';
import { SortOrder } from 'src/shared/enums/sort.enum';
import { SessionLocation } from 'src/shared/types/group-session.type';
import { formatTimeOnly } from 'src/shared/utils/time.utils';
import { ImageService } from '../image/image.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly recommendationHelper: RecommendationHelper,
    private readonly searchService: SearchService,
    private readonly prismaService: PrismaService,
    private readonly imageService: ImageService,
    private readonly kafkaService: KafkaService,
  ) {}

  private async enrichPlacesWithRelations(
    places: RecommendationPlaceRow[],
  ): Promise<PlaceRecommendationResponseDto[]> {
    if (places.length === 0) {
      return [];
    }

    const placeIds = places.map((p) => p.id);

    const placesWithRelations = await this.prismaService.place.findMany({
      where: { id: { in: placeIds } },
      include: {
        openingHours: {
          select: { dayOfWeek: true, openTime: true, closeTime: true },
          orderBy: { dayOfWeek: 'asc' },
        },
        placeCategories: {
          select: {
            isMain: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const relationsMap = new Map(placesWithRelations.map((p) => [p.id, p]));

    return await Promise.all(
      places.map(async (place) => {
        const relations = relationsMap.get(place.id);
        return {
          ...place,
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

  private async assertGroupSessionMember(params: {
    sessionId: string;
    userId?: string;
    guestId?: string;
  }): Promise<void> {
    const { sessionId, userId, guestId } = params;

    if (!userId && !guestId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: GroupSessionMessages.NOT_A_MEMBER,
      });
    }

    const member = await this.prismaService.groupSessionMember.findFirst({
      where: userId ? { sessionId, userId } : { sessionId, guestId },
      select: { id: true },
    });

    if (!member) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: GroupSessionMessages.NOT_A_MEMBER,
      });
    }
  }

  private async getActiveSessionLocations(
    sessionId: string,
  ): Promise<SessionLocation[]> {
    const members = await this.prismaService.groupSessionMember.findMany({
      where: { sessionId, userId: { not: null } },
      select: { userId: true },
    });

    if (members.length === 0) {
      return [];
    }

    const locationEntries = await Promise.all(
      members.map(async ({ userId }) => {
        if (!userId) {
          return null;
        }

        const locationKey = RedisKeys.GROUP_SESSION.MEMBER_LOCATION(
          sessionId,
          userId,
        );
        const rawLocation = await this.redisService.get(locationKey);

        if (!rawLocation) {
          return null;
        }

        return this.recommendationHelper.parseSessionLocation(
          locationKey,
          rawLocation,
        );
      }),
    );

    return locationEntries.filter(
      (location): location is SessionLocation => location !== null,
    );
  }

  private async fetchGroupSessionRecommendationPlaces(params: {
    latitude: number;
    longitude: number;
    searchRadius: number;
    categoryIds: string[];
  }): Promise<PlaceRecommendationResponseDto[]> {
    const { latitude, longitude, searchRadius, categoryIds } = params;
    const boundingBox = this.recommendationHelper.getBoundingBoxCondition(
      latitude,
      longitude,
      searchRadius,
    );

    const categoryFilter =
      categoryIds.length > 0
        ? Prisma.sql`
          AND EXISTS (
            SELECT 1
            FROM place_categories pc
            WHERE pc.place_id = p.id
              AND pc.category_id IN (${Prisma.join(categoryIds)})
          )
        `
        : Prisma.empty;

    const placeRows = await this.prismaService.$queryRaw<
      RecommendationPlaceRow[]
    >`
      SELECT
        id,
        name,
        description,
        rating,
        "fullAddress",
        latitude,
        longitude,
        "featureImageUrl",
        "googleMapLink",
        "phoneNumber",
        website
      FROM (
        SELECT
          p.id,
          p.name,
          p.description,
          p.rating,
          p.full_address AS "fullAddress",
          p.latitude,
          p.longitude,
          p.feature_image_url AS "featureImageUrl",
          p.google_map_link AS "googleMapLink",
          p.phone_number AS "phoneNumber",
          p.website,
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
        WHERE p.latitude BETWEEN ${boundingBox.latitude.gte} AND ${boundingBox.latitude.lte}
          AND p.longitude BETWEEN ${boundingBox.longitude.gte} AND ${boundingBox.longitude.lte}
          ${categoryFilter}
      ) AS places_with_distance
      WHERE distance <= ${searchRadius}
      ORDER BY distance ASC, rating DESC
      LIMIT ${GROUP_SESSION_MAX_RECOMMENDATION_PLACES * 3}
    `;

    // Shuffle the candidate pool so each refresh returns a different selection
    const shuffled = [...placeRows].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, GROUP_SESSION_MAX_RECOMMENDATION_PLACES);

    return await this.enrichPlacesWithRelations(selected);
  }

  private async getContentBasedPlaceCandidates(
    userId: string,
    latitude: number,
    longitude: number,
  ) {
    try {
      return this.prismaService.place.findMany({
        where: {
          ...this.recommendationHelper.getBoundingBoxCondition(
            latitude,
            longitude,
            MAX_RECOMMENDATIONS_BOUNDING_KM,
          ),
          placeCategories: {
            some: {
              category: {
                userCategories: {
                  some: {
                    userId: userId,
                    isOnboardSelected: true,
                  },
                },
              },
            },
          },
        },
        take: MAX_CANDINDATE_PLACES,
        orderBy: {
          rating: SortOrder.DESC,
        },
      });
    } catch (error) {
      return [];
    }
  }

  private async getRecentlyInteractedPlaceCandidates(
    userId: string,
    latitude: number,
    longitude: number,
  ) {
    try {
      const recentSearches = await this.prismaService.search.findMany({
        where: { userId },
        orderBy: { createdAt: SortOrder.DESC },
        take: MAX_RECENT_SEARCHES_PER_USER,
      });

      const searchTerms = recentSearches
        .map((search) => search.extractedTerm?.trim())
        .filter((term): term is string => !!term);

      const recentCategories = await this.prismaService.userCategory.findMany({
        where: { userId },
        orderBy: { lastInteractedAt: SortOrder.DESC },
        take: MAX_RECENT_SEARCHES_PER_USER,
      });

      const categoryIds = recentCategories.map((uc) => uc.categoryId);

      const textSearchConditions = searchTerms.map((term) => ({
        name: { contains: term, mode: Prisma.QueryMode.insensitive },
      }));

      return this.prismaService.place.findMany({
        where: {
          ...this.recommendationHelper.getBoundingBoxCondition(
            latitude,
            longitude,
            MAX_RECOMMENDATIONS_BOUNDING_KM,
          ),
          OR: [
            { placeCategories: { some: { categoryId: { in: categoryIds } } } },
            ...(textSearchConditions.length > 0
              ? [{ OR: textSearchConditions }]
              : []),
          ],
        },
        take: MAX_CANDINDATE_PLACES,
        orderBy: {
          rating: SortOrder.DESC,
        },
      });
    } catch (error) {
      return [];
    }
  }

  private async getNetworkBasedPlaceCandidates(
    userId: string,
    latitude: number,
    longitude: number,
  ) {
    try {
      const friendships = await this.prismaService.friendship.findMany({
        where: { userId },
        select: { friendId: true },
      });

      const friendIds = friendships.map((f) => f.friendId);

      const userNetworkIds = [userId, ...friendIds];

      return this.prismaService.place.findMany({
        where: {
          OR: [
            {
              favorites: {
                some: { userId: { in: friendIds } },
              },
              ...this.recommendationHelper.getBoundingBoxCondition(
                latitude,
                longitude,
                MAX_RECOMMENDATIONS_BOUNDING_KM,
              ),
            },
            {
              wonGroupSessions: {
                some: {
                  members: {
                    some: {
                      userId: { in: userNetworkIds },
                    },
                  },
                },
              },
            },
          ],
        },
        take: MAX_CANDINDATE_PLACES,
        orderBy: { rating: SortOrder.DESC },
      });
    } catch (error) {
      return [];
    }
  }

  async getPlacesFromSearchTerms(searchTerms: string[]) {
    try {
      const placeRows = await this.prismaService.$queryRaw<
        RecommendationPlaceRow[]
      >`
      SELECT DISTINCT ON (p.id)
        p.id,
        p.name,
        p.description,
        p.rating,
        p.full_address as "fullAddress",
        p.latitude,
        p.longitude,
        p.feature_image_url as "featureImageUrl",
        p.google_map_link as "googleMapLink",
        p.phone_number as "phoneNumber",
        p.website
      FROM unnest(${searchTerms}::text[]) AS term
      CROSS JOIN LATERAL (
        SELECT p_inner.*
        FROM places p_inner
        LEFT JOIN user_actions ua 
        ON ua.place_id = p_inner.id
          -- AND ua.created_at > NOW() - INTERVAL '7 days'
        WHERE p_inner.name ILIKE '%' || term || '%'
        GROUP BY p_inner.id
        ORDER BY COUNT(ua.id) DESC, p_inner.rating DESC
        LIMIT ${PLACES_PER_SEARCH_TERM}
      ) p
      ORDER BY p.id; 
    `;

      const enhancedPlaces = await this.enrichPlacesWithRelations(placeRows);

      return enhancedPlaces;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updatePlaceFromTrendingSearchesForRedis(searchTerms: string[]) {
    try {
      const places = await this.getPlacesFromSearchTerms(searchTerms);
      await this.redisService.set(
        RedisKeys.RECOMMENDATION.PLACES_FROM_SEARCH_TERMS,
        JSON.stringify(places),
      );

      // await this.redisService.expire(
      //   RedisKeys.RECOMMENDATION.PLACES_FROM_SEARCH_TERMS,
      //   SEARCH_TRENDING_TTL_SECONDS
      // );
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getTopPlacesFromUserActions() {
    try {
      const placeRows = await this.prismaService.$queryRaw<
        RecommendationPlaceRow[]
      >`
        WITH constants AS (
          SELECT NOW() AS current_time, ${TIME_DECAY}::float AS decay_rate
        ),
        action_scores AS (
          SELECT
            ua.place_id,
            SUM(
              (CASE ua.action::text
                WHEN ${UserActionType.CLICK} THEN 0.1
                WHEN ${UserActionType.READ_REVIEWS} THEN 0.2
                WHEN ${UserActionType.FAVORITE} THEN 0.5
                WHEN ${UserActionType.RATE_4} THEN 0.5
                WHEN ${UserActionType.RATE_5} THEN 1.0
                ELSE 0
              END)
              * EXP(-c.decay_rate * (EXTRACT(EPOCH FROM c.current_time - ua.created_at) / 3600)::float)
            ) AS weighted_score,
            COUNT(DISTINCT ua.user_id)::float AS unique_users
          FROM user_actions ua
          CROSS JOIN constants c
          -- WHERE ua.created_at > c.current_time - INTERVAL '48 hours'
          GROUP BY ua.place_id
        )
        SELECT
          p.id,
          p.name,
          p.description,
          p.rating,
          p.full_address as "fullAddress",
          p.latitude,
          p.longitude,
          p.feature_image_url as "featureImageUrl",
          p.google_map_link as "googleMapLink",
          p.phone_number as "phoneNumber",
          p.website
        FROM action_scores a
        JOIN places p ON p.id = a.place_id 
        ORDER BY (a.weighted_score * LN(a.unique_users + 1)) DESC
        LIMIT 10
      `;

      const enrichedPlaces = await this.enrichPlacesWithRelations(placeRows);

      return enrichedPlaces;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updateTrendingPlaceFromActionsForRedis() {
    try {
      const places = await this.getTopPlacesFromUserActions();
      await this.redisService.set(
        RedisKeys.RECOMMENDATION.PLACES_FROM_USER_ACTIONS,
        JSON.stringify(places),
      );

      // await this.redisService.expire(
      //   RedisKeys.RECOMMENDATION.PLACES_FROM_USER_ACTIONS,
      //   SEARCH_TRENDING_TTL_SECONDS
      // );
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getTrending() {
    let rawCachedPlacesFromSearchTerms: string | null = null;
    let rawCachedPlacesFromActions: string | null = null;
    try {
      rawCachedPlacesFromSearchTerms = await this.redisService.get(
        RedisKeys.RECOMMENDATION.PLACES_FROM_SEARCH_TERMS,
      );
    } catch (error: any) {
      this.logger.error(
        'Error fetching trending places from search terms from Redis',
        error.stack,
      );
    }

    try {
      rawCachedPlacesFromActions = await this.redisService.get(
        RedisKeys.RECOMMENDATION.PLACES_FROM_USER_ACTIONS,
      );
    } catch (error: any) {
      this.logger.error(
        'Error fetching trending places from user actions from Redis',
        error.stack,
      );
    }

    let cachedPlacesFromSearchTerms = rawCachedPlacesFromSearchTerms
      ? JSON.parse(rawCachedPlacesFromSearchTerms)
      : [];
    let cachedPlacesFromActions = rawCachedPlacesFromActions
      ? JSON.parse(rawCachedPlacesFromActions)
      : [];

    try {
      if (cachedPlacesFromSearchTerms.length === 0) {
        const searchTerms = await this.searchService.getTrending();
        cachedPlacesFromSearchTerms = await this.getPlacesFromSearchTerms(
          searchTerms
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((search) => search.extractedTerm),
        );
      }

      if (cachedPlacesFromActions.length === 0) {
        cachedPlacesFromActions = await this.getTopPlacesFromUserActions();
      }
    } catch (error: any) {
      this.logger.error(
        'Error fetching trending places from database',
        error.stack,
      );
    }

    const trendingPlaces = this.recommendationHelper.deduplicatePlaces([
      ...cachedPlacesFromSearchTerms,
      ...cachedPlacesFromActions,
    ]);

    return this.recommendationHelper.shufflePlaces(trendingPlaces);
  }

  async getForYou(userId: string, latitude: number, longitude: number) {
    try {
      const [contentBased, recentlyInteracted, networkBased] =
        await Promise.all([
          this.getContentBasedPlaceCandidates(userId, latitude, longitude),
          this.getRecentlyInteractedPlaceCandidates(
            userId,
            latitude,
            longitude,
          ),
          this.getNetworkBasedPlaceCandidates(userId, latitude, longitude),
        ]);

      const allCandidates = [
        ...recentlyInteracted,
        ...contentBased,
        ...networkBased,
      ];

      const enrichedCandidates =
        await this.enrichPlacesWithRelations(allCandidates);

      const deduplicatedCandidates =
        this.recommendationHelper.deduplicatePlaces(enrichedCandidates);

      try {
        const rankingResults = await this.kafkaService.sendWithTimeout(
          IntelligenceTopics.Ranking,
          { userId, placeIds: deduplicatedCandidates.map((place) => place.id) },
        );

        return rankingResults.map(
          (result: { place_id: string; ranking_score: number }) => {
            const place = deduplicatedCandidates.find(
              (p) => p.id === result.place_id,
            );
            return {
              ...place,
              rankingScore: result.ranking_score,
            };
          },
        );
      } catch (error) {
        return this.recommendationHelper.shufflePlaces(deduplicatedCandidates);
      }
    } catch (error: any) {
      this.logger.error(
        'Error fetching personalized recommendations',
        error.stack,
      );
      handleServiceErrorCatching(error);
    }
  }

  async getGroupSessionRecommendations(data: {
    sessionId: string;
    userId?: string;
    guestId?: string;
  }) {
    try {
      const { sessionId, userId, guestId } = data;
      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
        include: {
          selectedCategories: {
            select: { categoryId: true },
          },
        },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.SESSION_NOT_ACTIVE,
        });
      }

      await this.assertGroupSessionMember({ sessionId, userId, guestId });

      const activeLocations = await this.getActiveSessionLocations(sessionId);

      if (activeLocations.length < GROUP_SESSION_RECOMMENDATION_MIN_MEMBERS) {
        throw new RpcException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          message: GroupSessionMessages.NOT_ENOUGH_MEMBERS_FOR_RECOMMENDATION,
        });
      }

      const cacheKey =
        RedisKeys.RECOMMENDATION.GROUP_SESSION_RECOMMENDATIONS(sessionId);
      const rawCachedPlaces = await this.redisService.get(cacheKey);

      let cachedPlaces: PlaceRecommendationResponseDto[] | null = null;
      if (rawCachedPlaces) {
        try {
          cachedPlaces = JSON.parse(
            rawCachedPlaces,
          ) as PlaceRecommendationResponseDto[];
        } catch {
          cachedPlaces = null;
        }
      }

      if (cachedPlaces) {
        return cachedPlaces;
      }

      const categoryIds = session.selectedCategories.map(
        (category) => category.categoryId,
      );

      const centroid =
        this.recommendationHelper.calculateCentroid(activeLocations);

      const places =
        centroid.latitude === null || centroid.longitude === null
          ? []
          : await this.fetchGroupSessionRecommendationPlaces({
              latitude: centroid.latitude,
              longitude: centroid.longitude,
              searchRadius: session.searchRadius,
              categoryIds,
            });

      if (places.length === 0) {
        throw new RpcException({
          status: HttpStatus.OK,
          message: GroupSessionMessages.RECOMMENDATION_EMPTY,
        });
      }

      await this.redisService.setEx(
        cacheKey,
        JSON.stringify(places),
        GROUP_SESSION_RECOMMENDATION_TTL_SECONDS,
      );

      return places;
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async handleGroupSessionRecommendationCacheInvalidationEvent(data: {
    sessionId: string;
  }) {
    try {
      await this.redisService.del(
        RedisKeys.RECOMMENDATION.GROUP_SESSION_RECOMMENDATIONS(data.sessionId),
      );
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async trainRankingModel() {
    return this.kafkaService
      .getClient()
      .emit(IntelligenceTopics.TrainRankingModel, {});
  }
}
