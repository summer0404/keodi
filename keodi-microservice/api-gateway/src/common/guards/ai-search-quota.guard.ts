import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from 'src/providers/redis/redis.service';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import { AI_SEARCH_DAILY_LIMIT } from 'src/shared/constants/place.constant';
import { ApiErrorMessages } from 'src/shared/constants/error.constant';

@Injectable()
export class AiSearchCreditGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string = request?.user?.id;

    const creditKey = RedisKeys.AI_SEARCH.DAILY_CREDIT(userId);
    const usedCredit = await this.redisService.incr(creditKey);

    if (usedCredit === 1) {
      await this.redisService.expireAt(creditKey, this.getVietnamMidnightUnixSeconds());
    }

    if (usedCredit > AI_SEARCH_DAILY_LIMIT) {
      throw new HttpException(ApiErrorMessages.AI_SEARCH_DAILY_QUOTA_EXHAUSTED, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getVietnamMidnightUnixSeconds(): number {
    const nowUtc = Date.now();
    const vietnamOffsetMs = 7 * 3600 * 1000;
    const nowInVietnam = new Date(nowUtc + vietnamOffsetMs);
    const midnightUtc = Date.UTC(
      nowInVietnam.getUTCFullYear(),
      nowInVietnam.getUTCMonth(),
      nowInVietnam.getUTCDate() + 1,
    );
    return Math.floor((midnightUtc - vietnamOffsetMs) / 1000);
  }
}
