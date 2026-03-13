import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService {
    private readonly redis: Redis

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD
        })
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key)
    }

    async has(key: string): Promise<boolean> {
        return await this.redis.exists(key) === 1
    }

    async zadd(key: string, coreMember: (string | number)[]): Promise<void> {
        await this.redis.zadd(key, ...coreMember)
    }
}