import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService {
    private readonly redis: Redis

    constructor(private readonly configService: ConfigService) {
        this.redis = new Redis({
            host: this.configService.get<string>('REDIS_HOST'),
            port: Number(this.configService.get<string>('REDIS_PORT')),
            password: this.configService.get<string>('REDIS_PASSWORD')
        })
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key)
    }

    async has(key: string): Promise<boolean> {
        return await this.redis.exists(key) === 1
    }
}