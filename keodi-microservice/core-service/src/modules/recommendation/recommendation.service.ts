import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/providers/redis/redis.service';
import {
  MAX_CANDINDATE_PLACES,
  MAX_RECOMMENDATIONS_BOUNDING_KM,
  PLACES_PER_SEARCH_TERM,
  RecommendationRedisKeys,
  TIME_DECAY,
} from 'src/shared/constants/recommendation.constant';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { RecommendationHelper } from './recommendation.helper';
// import { SEARCH_TRENDING_TTL_SECONDS } from 'src/shared/constants/search.constant';
import { Prisma, UserActionType } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { MAX_RECENT_SEARCHES_PER_USER } from 'src/shared/constants/search.constant';
import { IntelligenceTopics } from 'src/shared/constants/topic.constant';
import { PlaceRecommendationResponseDto } from 'src/shared/dtos/recommendation.dto';
import { SortOrder } from 'src/shared/enums/sort.enum';
import { formatTimeOnly } from 'src/shared/helpers/time.helper';
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
    places: Omit<
      PlaceRecommendationResponseDto,
      'openingHours' | 'categories'
    >[],
  ): Promise<PlaceRecommendationResponseDto[]> {
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

      const searchTerms = recentSearches.map((search) => search.extractedTerm);

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
      const allPlaces = await this.prismaService.$queryRaw<
        PlaceRecommendationResponseDto[]
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

      const enhancedPlaces = await this.enrichPlacesWithRelations(allPlaces);

      return enhancedPlaces;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updatePlaceFromTrendingSearchesForRedis(searchTerms: string[]) {
    try {
      const places = await this.getPlacesFromSearchTerms(searchTerms);
      await this.redisService.set(
        RecommendationRedisKeys.PLACES_FROM_SEARCH_TERMS,
        JSON.stringify(places),
      );

      // await this.redisService.expire(
      //   RecommendationRedisKeys.PLACES_FROM_SEARCH_TERMS,
      //   SEARCH_TRENDING_TTL_SECONDS
      // );
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getTopPlacesFromUserActions() {
    try {
      const places = await this.prismaService.$queryRaw<
        PlaceRecommendationResponseDto[]
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

      const enrichedPlaces = await this.enrichPlacesWithRelations(places);

      return enrichedPlaces;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updateTrendingPlaceFromActionsForRedis() {
    try {
      const places = await this.getTopPlacesFromUserActions();
      await this.redisService.set(
        RecommendationRedisKeys.PLACES_FROM_USER_ACTIONS,
        JSON.stringify(places),
      );

      // await this.redisService.expire(
      //   RecommendationRedisKeys.PLACES_FROM_USER_ACTIONS,
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
        RecommendationRedisKeys.PLACES_FROM_SEARCH_TERMS,
      );
    } catch (error) {
      this.logger.error(
        'Error fetching trending places from search terms from Redis',
        error.stack,
      );
    }

    try {
      rawCachedPlacesFromActions = await this.redisService.get(
        RecommendationRedisKeys.PLACES_FROM_USER_ACTIONS,
      );
    } catch (error) {
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
    } catch (error) {
      this.logger.error(
        'Error fetching trending places from database',
        error.stack,
      );
    }

    const trendingPlaces = this.recommendationHelper.deduplicatePlaces([
      ...cachedPlacesFromSearchTerms,
      ...cachedPlacesFromActions,
    ]);

    const shuffledTrendingPlaces =
      this.recommendationHelper.shufflePlaces(trendingPlaces);

    return shuffledTrendingPlaces;
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
    } catch (error) {
      this.logger.error(
        'Error fetching personalized recommendations',
        error.stack,
      );
      handleServiceErrorCatching(error);
    }
  }

  async trainRankingModel() {
    return this.kafkaService
      .getClient()
      .emit(IntelligenceTopics.TrainRankingModel, {});
  }
}
