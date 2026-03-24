import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/providers/redis/redis.service';
import {
  PLACES_PER_SEARCH_TERM,
  RecommendationRedisKeys,
  TIME_DECAY,
} from 'src/shared/constants/recommendation.constant';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { RecommendationHelper } from './recommendation.helper';
// import { SEARCH_TRENDING_TTL_SECONDS } from 'src/shared/constants/search.constant';
import { UserActionType } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PlaceRecommendationResponseDto } from 'src/shared/dtos/recommendation.dto';
import { ImageService } from '../image/image.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly redisService: RedisService,
    private readonly recommendationHelper: RecommendationHelper,
    private readonly searchService: SearchService,
    private readonly prismaService: PrismaService,
    private readonly imageService: ImageService,
  ) { }

  private async enrichPlacesWithRelations(
    places: PlaceRecommendationResponseDto[],
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

  async getPlacesFromSearchTerms(searchTerms: string[]) {
    try {
      const allPlaces = await this.prismaService.$queryRaw<PlaceRecommendationResponseDto[]>`
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
      console.error('SQL Error in getTopPlacesFromUserActions:', error);
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
      console.error(
        'Error fetching trending places from search terms from Redis:',
        error,
      );
    }

    try {
      rawCachedPlacesFromActions = await this.redisService.get(
        RecommendationRedisKeys.PLACES_FROM_USER_ACTIONS,
      );
    } catch (error) {
      console.error(
        'Error fetching trending places from user actions from Redis:',
        error,
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
      console.error('Error fetching trending places from database:', error);
    }

    const trendingPlaces = this.recommendationHelper.deduplicatePlaces([
      ...cachedPlacesFromSearchTerms,
      ...cachedPlacesFromActions,
    ]);

    // TODO: Ranking recommedation for more personalized result
    // For now, we just shuffle the places to make it more dynamic
    const shuffledTrendingPlaces =
      this.recommendationHelper.shufflePlaces(trendingPlaces);

    return shuffledTrendingPlaces;
  }

  async getForYou() {

  }
}
