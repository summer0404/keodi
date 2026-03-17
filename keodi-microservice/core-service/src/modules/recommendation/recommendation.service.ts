import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/providers/redis/redis.service';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { PLACES_PER_SEARCH_TERM, RecommendationRedisKeys, TIME_DECAY } from 'src/shared/constants/recommendation.constant';
import { RecommendationHelper } from './recommendation.helper';
import { SEARCH_TRENDING_TTL_SECONDS } from 'src/shared/constants/search.constant';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from '../image/image.service';
import { UserActionType } from '@prisma/client';
import { SearchService } from '../search/search.service';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly redisService: RedisService,
    private readonly recommendationHelper: RecommendationHelper,
    private readonly searchService: SearchService,
    private readonly prismaService: PrismaService,
    private readonly imageService: ImageService
  ) { }

  async getPlacesFromSearchTerms(searchTerms: string[]) {
    try {
      const allPlaces = (await Promise.all(
        searchTerms.map(async (term) => {
          const places = await this.prismaService.$queryRaw<any[]>`
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
                    p.website,
                    COUNT(ua.id) AS actions
                FROM places p
                LEFT JOIN user_actions ua
                    ON ua.place_id = p.id
                    -- AND ua.created_at > NOW() - INTERVAL '7 days'
                WHERE
                    p.name ILIKE '%' || ${term} || '%'
                GROUP BY p.id
                ORDER BY actions DESC, p.rating DESC
                LIMIT ${PLACES_PER_SEARCH_TERM}
            `;

          const enrichedPlaces = await Promise.all(
            places.map(async (place) => ({
              ...place,
              actions: Number(place.actions),
              featureImageUrl: place.featureImageUrl
                ? await this.imageService.getImageViewUrl(place.featureImageUrl)
                : null,
            }))
          );

          return enrichedPlaces;
        })
      )).flatMap(places => places);

      const uniquePlaces = this.recommendationHelper.deduplicatePlaces(allPlaces);

      return uniquePlaces;
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

      await this.redisService.expire(RecommendationRedisKeys.PLACES_FROM_SEARCH_TERMS, SEARCH_TRENDING_TTL_SECONDS);

    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getTopPlacesFromUserActions() {
    try {
      const places = await this.prismaService.$queryRaw<any[]>`
        WITH constants AS (
          SELECT NOW() AS current_time, ${TIME_DECAY} AS decay_rate
        ),
        action_scores AS (
          SELECT
            ua.place_id,
            SUM(
              (CASE ua.action
                WHEN ${UserActionType.CLICK} THEN 0.1
                WHEN ${UserActionType.READ_REVIEWS} THEN 0.2
                WHEN ${UserActionType.FAVORITE} THEN 0.5
                WHEN ${UserActionType.RATE_4} THEN 0.5
                WHEN ${UserActionType.RATE_5} THEN 1.0
                ELSE 0
              END)
              * EXP(-c.decay_rate * EXTRACT(EPOCH FROM c.current_time - ua.created_at) / 3600)
            ) AS weighted_score,
            COUNT(DISTINCT ua.user_id) AS unique_users,
            COUNT(*) AS actions
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
          p.website,
          a.actions,
          (a.weighted_score * LN(a.unique_users + 1)) AS final_score
        FROM action_scores a
        JOIN places p ON p.id = a.place_id
        ORDER BY final_score DESC
        LIMIT 20`

      const enrichedPlaces = await Promise.all(
        places.map(async (place) => ({
          ...place,
          featureImageUrl: place.featureImageUrl
            ? await this.imageService.getImageViewUrl(place.featureImageUrl)
            : null,
        }))
      );

      return enrichedPlaces;
    }
    catch (error) {
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

      await this.redisService.expire(RecommendationRedisKeys.PLACES_FROM_USER_ACTIONS, SEARCH_TRENDING_TTL_SECONDS);
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getTrending() {
    let rawCachedPlacesFromSearchTerms: string | null = null;
    let rawCachedPlacesFromActions: string | null = null;
    try {
      rawCachedPlacesFromSearchTerms = await this.redisService.get(RecommendationRedisKeys.PLACES_FROM_SEARCH_TERMS);
    } catch (error) {
      console.error('Error fetching trending places from search terms from Redis:', error);
    }

    try {
      rawCachedPlacesFromActions = await this.redisService.get(RecommendationRedisKeys.PLACES_FROM_USER_ACTIONS);
    } catch (error) {
      console.error('Error fetching trending places from user actions from Redis:', error);
    }

    let cachedPlacesFromSearchTerms = rawCachedPlacesFromSearchTerms ? JSON.parse(rawCachedPlacesFromSearchTerms) : [];
    let cachedPlacesFromActions = rawCachedPlacesFromActions ? JSON.parse(rawCachedPlacesFromActions) : [];

    try {
      if (cachedPlacesFromSearchTerms.length === 0) {
        const searchTerms = await this.searchService.getTrending();
        cachedPlacesFromSearchTerms = await this.getPlacesFromSearchTerms(searchTerms
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(search => search.extractedTerm));
      }

      if (cachedPlacesFromActions.length === 0) {
        cachedPlacesFromActions = await this.getTopPlacesFromUserActions();
      }
    } catch (error) {
      console.error('Error fetching trending places from database:', error);
    }

    const trendingPlaces = this.recommendationHelper.deduplicatePlaces([...cachedPlacesFromSearchTerms, ...cachedPlacesFromActions]);

    // TODO: Ranking recommedation for more personalized result

    return trendingPlaces;
  }
}
