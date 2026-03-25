import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';

@Injectable()
export class SearchService {
    constructor(
        private readonly kafkaService: KafkaService,
        private readonly redisService: RedisService,
    ) { }

    async getTrending() {
        try {
            const redisTrendingSearches = await this.redisService.zrevrange('search:trending', 0, 5);
            if (redisTrendingSearches && redisTrendingSearches.length > 0) {
                return redisTrendingSearches;
            }
        } catch (redisError) { }

        const trendingSearches: {
            extractedTerm: string;
            score: number
        }[] = await firstValueFrom(this.kafkaService.getClient().send('search.trending', {}));

        this.kafkaService.getClient().emit('search.update-trending-for-redis', { trendingSearches });

        return trendingSearches
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(search => search.extractedTerm);
    }
}
