import { Injectable } from '@nestjs/common';
import {
  CreateSearchDto,
  SearchTrendingScoreDto,
} from 'src/shared/dtos/search.dto';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/providers/redis/redis.service';
import {
  MAX_RECENT_SEARCHES_PER_USER,
  SEARCH_TRENDING_TTL_SECONDS,
  SearchRedisKeys,
} from 'src/shared/constants/search.constant';

@Injectable()
export class SearchService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}
  async updateTrendingForRedis(trendingSearches: SearchTrendingScoreDto[]) {
    try {
      await this.redisService.zadd(
        SearchRedisKeys.TRENDING,
        trendingSearches.flatMap((search) => [
          search.score,
          search.extractedTerm,
        ]),
      );
      await this.redisService.expire(
        SearchRedisKeys.TRENDING,
        SEARCH_TRENDING_TTL_SECONDS,
      );
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}
  async updateTrendingForRedis(trendingSearches: SearchTrendingScoreDto[]) {
    try {
      await this.redisService.zadd(
        SearchRedisKeys.TRENDING,
        trendingSearches.flatMap((search) => [
          search.score,
          search.extractedTerm,
        ]),
      );
      await this.redisService.expire(
        SearchRedisKeys.TRENDING,
        SEARCH_TRENDING_TTL_SECONDS,
      );
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async create(createSearchDto: CreateSearchDto) {
    try {
      return await this.prismaService.search.create({
        data: {
          ...createSearchDto,
          extractedTerm:
            createSearchDto.extractedTerm &&
            createSearchDto.extractedTerm.trim() !== ''
              ? createSearchDto.extractedTerm.trim().toLowerCase()
              : null,
        },
      });
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getTrending() {
    try {
      return await this.prismaService.$queryRaw<Array<SearchTrendingScoreDto>>`
                WITH time_weighted AS (
                    SELECT
                        extracted_term,
                        COUNT(*) as total_count,
                        MAX(created_at) as last_search,
                        SUM(
                            CASE
                                WHEN created_at > NOW() - INTERVAL '1 hour'
                                    THEN EXP(-0.05 * EXTRACT(EPOCH FROM NOW() - created_at)/3600)
                                WHEN created_at > NOW() - INTERVAL '6 hour'
                                    THEN EXP(-0.1 * EXTRACT(EPOCH FROM NOW() - created_at)/3600)
                                ELSE EXP(-0.2 * EXTRACT(EPOCH FROM NOW() - created_at)/3600)
                            END
                        ) as decay_score
                    FROM searches
                    WHERE extracted_term IS NOT NULL 
                        -- AND created_at > NOW() - INTERVAL '24 hour'
                    GROUP BY extracted_term
                    -- HAVING COUNT(*) > 0
                )
                SELECT
                    extracted_term as "extractedTerm",
                    ( decay_score * 0.6 + total_count * 0.4 ) as score
                FROM time_weighted
                ORDER BY score DESC
                LIMIT 50;
             `;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async clearOldHistory() {
    try {
      return await this.prismaService.$executeRaw`
                DELETE FROM searches
                WHERE id IN (
                    SELECT id
                    FROM (
                        SELECT 
                            id,
                            user_id,
                            created_at,
                            ROW_NUMBER() OVER (
                                PARTITION BY user_id
                                ORDER BY created_at DESC
                            ) as row_number
                        FROM searches
                    ) as temp_table
                    WHERE 
                        created_at < NOW() - INTERVAL '30 day'
                        AND (
                            row_number > ${MAX_RECENT_SEARCHES_PER_USER}
                            OR user_id IS NULL
                        )
                )
            `;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
