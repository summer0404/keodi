import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import { SearchTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class SearchService {
    constructor(
        private readonly kafkaService: KafkaService,
        private readonly redisService: RedisService,
    ) { }

    async getTrending() {
        try {
            const redisTrendingSearches = await this.redisService.zrevrange(
                RedisKeys.SEARCH.TRENDING,
                0,
                5,
            );
            if (redisTrendingSearches && redisTrendingSearches.length > 0) {
                return redisTrendingSearches;
            }
        } catch (redisError) { }

        const trendingSearches: {
            extractedTerm: string;
            score: number
        }[] = await this.kafkaService.sendWithTimeout(SearchTopics.Trending, {});

        this.kafkaService.getClient().emit(SearchTopics.UpdateTrendingForRedis, { trendingSearches });

        return trendingSearches
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(search => search.extractedTerm);
    }
}
