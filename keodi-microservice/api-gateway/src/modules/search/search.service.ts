import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices/client/client-kafka';
import { firstValueFrom } from 'rxjs';
import { RedisService } from 'src/providers/redis/redis.service';

@Injectable()
export class SearchService {
    constructor(
        @Inject('KAFKA_SERVICE') private readonly clientKafka: ClientKafka,
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
        }[] = await firstValueFrom(this.clientKafka.send('search.trending', {}));

        return trendingSearches
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(search => search.extractedTerm);
    }
}
