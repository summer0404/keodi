import { RedisService } from 'src/providers/redis/redis.service';

export class PresenceHelper {
  static async isOnline(
    redisService: RedisService,
    userId: string,
  ): Promise<boolean> {
    const val = await redisService.get(`presence:${userId}`);
    return val === 'online';
  }
}
