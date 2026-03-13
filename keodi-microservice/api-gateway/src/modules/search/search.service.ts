import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/providers/redis/redis.service';

@Injectable()
export class SearchService {
    constructor(
        private readonly redisService: RedisService,
    ) {}

    async getTrending() {
        
    }
}
