import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../search.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { SearchTopics } from 'src/shared/constants/topic.constant';
import { RedisKeys } from 'src/shared/constants/redis.constant';

const mockKafkaClient = {
  emit: jest.fn(),
};

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

const mockRedisService = {
  zrevrange: jest.fn(),
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);
  });

  describe('getTrending', () => {
    it('should return cached redis results when available', async () => {
      const cachedTerms = ['cafe', 'restaurant', 'pizza'];
      mockRedisService.zrevrange.mockResolvedValue(cachedTerms);

      const result = await service.getTrending();

      expect(mockRedisService.zrevrange).toHaveBeenCalledWith(
        RedisKeys.SEARCH.TRENDING,
        0,
        5,
      );
      expect(result).toEqual(cachedTerms);
      expect(mockKafkaService.sendWithTimeout).not.toHaveBeenCalled();
    });

    it('should fallback to kafka when redis returns empty array', async () => {
      mockRedisService.zrevrange.mockResolvedValue([]);
      const kafkaResult = [
        { extractedTerm: 'coffee', score: 100 },
        { extractedTerm: 'sushi', score: 80 },
        { extractedTerm: 'pizza', score: 60 },
      ];
      mockKafkaService.sendWithTimeout.mockResolvedValue(kafkaResult);

      const result = await service.getTrending();

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        SearchTopics.Trending,
        {},
      );
      expect(result).toEqual(['coffee', 'sushi', 'pizza']);
    });

    it('should fallback to kafka when redis returns null', async () => {
      mockRedisService.zrevrange.mockResolvedValue(null);
      const kafkaResult = [{ extractedTerm: 'burger', score: 50 }];
      mockKafkaService.sendWithTimeout.mockResolvedValue(kafkaResult);

      const result = await service.getTrending();

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalled();
      expect(result).toEqual(['burger']);
    });

    it('should fallback to kafka when redis throws an error', async () => {
      mockRedisService.zrevrange.mockRejectedValue(new Error('Redis connection error'));
      const kafkaResult = [
        { extractedTerm: 'noodles', score: 90 },
        { extractedTerm: 'tacos', score: 70 },
      ];
      mockKafkaService.sendWithTimeout.mockResolvedValue(kafkaResult);

      const result = await service.getTrending();

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        SearchTopics.Trending,
        {},
      );
      expect(result).toEqual(['noodles', 'tacos']);
    });

    it('should emit UpdateTrendingForRedis event after kafka fetch', async () => {
      mockRedisService.zrevrange.mockResolvedValue([]);
      const kafkaResult = [{ extractedTerm: 'brunch', score: 55 }];
      mockKafkaService.sendWithTimeout.mockResolvedValue(kafkaResult);

      await service.getTrending();

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        SearchTopics.UpdateTrendingForRedis,
        { trendingSearches: kafkaResult },
      );
    });

    it('should sort kafka results by score descending and slice to top 5', async () => {
      mockRedisService.zrevrange.mockResolvedValue([]);
      const kafkaResult = [
        { extractedTerm: 'a', score: 10 },
        { extractedTerm: 'b', score: 50 },
        { extractedTerm: 'c', score: 30 },
        { extractedTerm: 'd', score: 80 },
        { extractedTerm: 'e', score: 20 },
        { extractedTerm: 'f', score: 60 },
        { extractedTerm: 'g', score: 40 },
      ];
      mockKafkaService.sendWithTimeout.mockResolvedValue(kafkaResult);

      const result = await service.getTrending();

      expect(result).toEqual(['d', 'f', 'b', 'g', 'c']);
      expect(result).toHaveLength(5);
    });

    it('should return only extractedTerm strings from kafka fallback', async () => {
      mockRedisService.zrevrange.mockResolvedValue(null);
      mockKafkaService.sendWithTimeout.mockResolvedValue([
        { extractedTerm: 'pasta', score: 99 },
      ]);

      const result = await service.getTrending();

      expect(result).toEqual(['pasta']);
      expect(typeof result[0]).toBe('string');
    });
  });
});
