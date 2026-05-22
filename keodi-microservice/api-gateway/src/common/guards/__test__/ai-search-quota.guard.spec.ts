import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'src/providers/redis/redis.service';
import { AI_SEARCH_DAILY_LIMIT } from 'src/shared/constants/place.constant';
import { AiSearchCreditGuard } from '../ai-search-quota.guard';

const mockRedisService = {
  incr: jest.fn(),
  expireAt: jest.fn(),
};

function buildContext(userId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: userId } }),
    }),
  } as unknown as ExecutionContext;
}

describe('AiSearchCreditGuard', () => {
  let guard: AiSearchCreditGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSearchCreditGuard,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<AiSearchCreditGuard>(AiSearchCreditGuard);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow request and set TTL on first credit of the day', async () => {
    mockRedisService.incr.mockResolvedValue(1);
    mockRedisService.expireAt.mockResolvedValue(undefined);

    const result = await guard.canActivate(buildContext('user-1'));

    expect(result).toBe(true);
    expect(mockRedisService.expireAt).toHaveBeenCalledTimes(1);
  });

  it('should allow request without setting TTL on subsequent credits', async () => {
    mockRedisService.incr.mockResolvedValue(2);

    const result = await guard.canActivate(buildContext('user-1'));

    expect(result).toBe(true);
    expect(mockRedisService.expireAt).not.toHaveBeenCalled();
  });

  it('should allow request when credit equals the daily limit', async () => {
    mockRedisService.incr.mockResolvedValue(AI_SEARCH_DAILY_LIMIT);

    const result = await guard.canActivate(buildContext('user-1'));

    expect(result).toBe(true);
  });

  it('should throw 429 when credit exceeds the daily limit', async () => {
    mockRedisService.incr.mockResolvedValue(AI_SEARCH_DAILY_LIMIT + 1);

    await expect(guard.canActivate(buildContext('user-1'))).rejects.toThrow(
      expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS }),
    );
  });

  it('should use a per-user Redis key', async () => {
    mockRedisService.incr.mockResolvedValue(1);
    mockRedisService.expireAt.mockResolvedValue(undefined);

    await guard.canActivate(buildContext('user-abc'));

    expect(mockRedisService.incr).toHaveBeenCalledWith(
      expect.stringContaining('user-abc'),
    );
  });
});
