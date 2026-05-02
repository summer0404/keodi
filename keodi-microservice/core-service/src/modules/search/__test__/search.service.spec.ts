import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../search.service';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/providers/redis/redis.service';

const mockPrismaService = {
  search: { create: jest.fn() },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

const mockRedisService = {
  zadd: jest.fn(),
  expire: jest.fn(),
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    it('trims rawQuery and normalizes extractedTerm before persisting', async () => {
      const created = { id: 'search-1', rawQuery: 'coffee', extractedTerm: 'coffee' };
      mockPrismaService.search.create.mockResolvedValue(created);

      const result = await service.create({ rawQuery: '  coffee  ', extractedTerm: '  COFFEE  ', userId: 'u1' } as any);

      const call = mockPrismaService.search.create.mock.calls[0][0];
      expect(call.data.rawQuery).toBe('coffee');
      expect(call.data.extractedTerm).toBe('coffee');
    });

    it('stores null extractedTerm when not provided', async () => {
      mockPrismaService.search.create.mockResolvedValue({ id: 'search-2' });

      await service.create({ rawQuery: 'query', extractedTerm: undefined, userId: null } as any);

      const call = mockPrismaService.search.create.mock.calls[0][0];
      expect(call.data.extractedTerm).toBeNull();
    });

    it('handles database errors via handleServiceErrorCatching', async () => {
      mockPrismaService.search.create.mockRejectedValue(new Error('DB down'));

      await expect(service.create({ rawQuery: 'query', extractedTerm: null, userId: 'u1' } as any)).rejects.toThrow();
    });
  });

  // ──────────────────────────────────────────────
  // getTrending
  // ──────────────────────────────────────────────
  describe('getTrending', () => {
    it('returns raw query results from prisma', async () => {
      const rows = [{ extractedTerm: 'coffee', score: 9.5 }];
      mockPrismaService.$queryRaw.mockResolvedValue(rows);

      const result = await service.getTrending();

      expect(result).toEqual(rows);
    });

    it('handles database errors', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB error'));

      await expect(service.getTrending()).rejects.toThrow();
    });
  });

  // ──────────────────────────────────────────────
  // updateTrendingForRedis
  // ──────────────────────────────────────────────
  describe('updateTrendingForRedis', () => {
    it('calls zadd and expire on redis', async () => {
      mockRedisService.zadd.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);

      await service.updateTrendingForRedis([{ extractedTerm: 'coffee', score: 5 }]);

      expect(mockRedisService.zadd).toHaveBeenCalled();
      expect(mockRedisService.expire).toHaveBeenCalled();
    });

    it('flattens scores and terms correctly for zadd', async () => {
      mockRedisService.zadd.mockResolvedValue(undefined);
      mockRedisService.expire.mockResolvedValue(undefined);

      await service.updateTrendingForRedis([
        { extractedTerm: 'coffee', score: 5 },
        { extractedTerm: 'tea', score: 3 },
      ]);

      const zaddArgs = mockRedisService.zadd.mock.calls[0];
      // zaddArgs[1] should contain [score1, term1, score2, term2]
      expect(zaddArgs[1]).toContain(5);
      expect(zaddArgs[1]).toContain('coffee');
      expect(zaddArgs[1]).toContain(3);
      expect(zaddArgs[1]).toContain('tea');
    });
  });

  // ──────────────────────────────────────────────
  // clearOldHistory
  // ──────────────────────────────────────────────
  describe('clearOldHistory', () => {
    it('executes raw delete query', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue(10);

      const result = await service.clearOldHistory();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });
});
