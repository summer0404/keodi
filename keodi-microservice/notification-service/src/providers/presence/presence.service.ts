import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/providers/redis/redis.service';

@Injectable()
export class PresenceService {
  constructor(private readonly redisService: RedisService) {}

  async isOnline(userId: string): Promise<boolean> {
    const val = await this.redisService.get(`presence:${userId}`);
    return val === 'online';
  }
}
