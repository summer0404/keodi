import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSearchDto, SearchTrendingScoreDto } from 'src/shared/dtos/search.dto';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/providers/redis/redis.service';

@Injectable()
export class SearchService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly redisService: RedisService,
    ){}
    async updateTrendingForRedis(trendingSearches: SearchTrendingScoreDto[]) {
        try {
            return await this.redisService.zadd('search:trending', trendingSearches.flatMap(search => [search.score, search.extractedTerm]));
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }

    async create(createSearchDto: CreateSearchDto) {
        const { extractedTerm, userId } = createSearchDto;

        try {            
            if (userId) {

                const existingUser = await this.prismaService.user.findUnique({
                    where: { id: userId },
                });

                if (!existingUser) {
                    throw new NotFoundException(`User not found`)
                }
            }

            return await this.prismaService.search.create({
                data: {
                    extractedTerm: extractedTerm.toLowerCase().trim(),
                    userId,
                }
            });
        } catch (error) {
            return await handleServiceErrorCatching(error)
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
                    WHERE
                        created_at > NOW() - INTERVAL '24 hour'
                    GROUP BY extracted_term
                    -- HAVING
                    --    COUNT(*) > 0
                )
                SELECT
                    extracted_term as "extractedTerm",
                    ( decay_score * 0.6 + total_count * 0.4 ) as score
                FROM time_weighted
                ORDER BY score DESC
                LIMIT 50;
             `;
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }
}
