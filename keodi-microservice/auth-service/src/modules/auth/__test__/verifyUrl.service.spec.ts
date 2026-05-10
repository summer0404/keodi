import { Test, TestingModule } from '@nestjs/testing';
import { VerifyUrlService } from '../verifyUrl.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';
import { NotificationTopics } from 'src/shared/constants/topic.constant';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-token'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('VerifyUrlService', () => {
  let service: VerifyUrlService;
  let redisService: jest.Mocked<RedisService>;
  let kafkaService: jest.Mocked<KafkaService>;
  let mockEmit: jest.Mock;

  beforeEach(async () => {
    mockEmit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyUrlService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            ttl: jest.fn(),
          },
        },
        {
          provide: KafkaService,
          useValue: {
            getClient: jest.fn().mockReturnValue({ emit: mockEmit }),
          },
        },
      ],
    }).compile();

    service = module.get<VerifyUrlService>(VerifyUrlService);
    redisService = module.get(RedisService);
    kafkaService = module.get(KafkaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('sendVerifyUrlWithPurpose', () => {
    it('stores hashed token in Redis with correct key and TTL', async () => {
      redisService.set.mockResolvedValue(undefined as any);

      await service.sendVerifyUrlWithPurpose(
        'user@example.com',
        'raw-token',
        VerifyUrlPurpose.VERIFY_EMAIL,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(
        'raw-token',
        Number(process.env.SALT_ROUNDS),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `verifyUrl:${VerifyUrlPurpose.VERIFY_EMAIL}:user@example.com`,
        'hashed-token',
        expect.any(Number),
      );
    });

    it('emits VerifyEmail notification with the full URL when purpose is verify-email', async () => {
      redisService.set.mockResolvedValue(undefined as any);
      process.env.VERIFY_EMAIL_API = 'http://localhost/verify?token=';

      await service.sendVerifyUrlWithPurpose(
        'user@example.com',
        'tok123',
        VerifyUrlPurpose.VERIFY_EMAIL,
      );

      expect(mockEmit).toHaveBeenCalledWith(
        NotificationTopics.VerifyEmail,
        expect.objectContaining({
          to: 'user@example.com',
          url: expect.stringContaining('tok123'),
        }),
      );
    });

    it('does not emit any notification for an unknown purpose', async () => {
      redisService.set.mockResolvedValue(undefined as any);

      await service.sendVerifyUrlWithPurpose(
        'user@example.com',
        'tok',
        'unknown-purpose',
      );

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('validateVerifyUrl', () => {
    it('returns false when token is not found in Redis', async () => {
      redisService.get.mockResolvedValue(null as any);

      const result = await service.validateVerifyUrl({
        email: 'user@example.com',
        token: 'tok',
        purpose: VerifyUrlPurpose.VERIFY_EMAIL,
      });

      expect(result).toBe(false);
      expect(redisService.delete).not.toHaveBeenCalled();
    });

    it('returns false when bcrypt compare fails', async () => {
      redisService.get.mockResolvedValue('hashed-token' as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateVerifyUrl({
        email: 'user@example.com',
        token: 'wrong-token',
        purpose: VerifyUrlPurpose.VERIFY_EMAIL,
      });

      expect(result).toBe(false);
      expect(redisService.delete).not.toHaveBeenCalled();
    });

    it('returns true and deletes the Redis key when token is valid', async () => {
      redisService.get.mockResolvedValue('hashed-token' as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      redisService.delete.mockResolvedValue(undefined as any);

      const result = await service.validateVerifyUrl({
        email: 'user@example.com',
        token: 'valid-token',
        purpose: VerifyUrlPurpose.VERIFY_EMAIL,
      });

      expect(result).toBe(true);
      expect(redisService.delete).toHaveBeenCalledWith(
        `verifyUrl:${VerifyUrlPurpose.VERIFY_EMAIL}:user@example.com`,
      );
    });

    it('queries Redis with the correct composite key', async () => {
      redisService.get.mockResolvedValue(null as any);

      await service.validateVerifyUrl({
        email: 'a@b.com',
        token: 'x',
        purpose: VerifyUrlPurpose.VERIFY_EMAIL,
      });

      expect(redisService.get).toHaveBeenCalledWith(
        `verifyUrl:${VerifyUrlPurpose.VERIFY_EMAIL}:a@b.com`,
      );
    });
  });

  describe('getTTLToken', () => {
    it('calls redisService.ttl with the correct key and returns the result', async () => {
      redisService.ttl.mockResolvedValue(1800 as any);

      const result = await service.getTTLToken(
        'user@example.com',
        VerifyUrlPurpose.VERIFY_EMAIL,
      );

      expect(redisService.ttl).toHaveBeenCalledWith(
        `verifyUrl:${VerifyUrlPurpose.VERIFY_EMAIL}:user@example.com`,
      );
      expect(result).toBe(1800);
    });

    it('returns a negative TTL when the key has expired or does not exist', async () => {
      redisService.ttl.mockResolvedValue(-2 as any);

      const result = await service.getTTLToken('nobody@example.com', VerifyUrlPurpose.VERIFY_EMAIL);

      expect(result).toBe(-2);
    });
  });
});
