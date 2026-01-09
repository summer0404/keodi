import { Injectable } from "@nestjs/common";
import Redis from 'ioredis'

@Injectable()
export class RedisService {
    private readonly redis: Redis

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT)
        })
    }

    async set(key: string, value: string, ttlSeconds: number) {
        await this.redis.set(key, value, 'EX', ttlSeconds)
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key)
    }

    async delete(key: string) {
        return this.redis.del(key)
    }

    async ttl(key: string) : Promise<number>{
        return this.redis.ttl(key)
    }
}