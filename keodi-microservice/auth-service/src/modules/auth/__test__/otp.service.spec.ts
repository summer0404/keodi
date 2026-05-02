import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from '../otp.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { NotificationTopics } from 'src/shared/constants/topic.constant';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-otp'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('OtpService', () => {
  let service: OtpService;
  let redisService: jest.Mocked<RedisService>;
  let kafkaService: jest.Mocked<KafkaService>;
  let mockEmit: jest.Mock;

  beforeEach(async () => {
    mockEmit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
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

    service = module.get<OtpService>(OtpService);
    redisService = module.get(RedisService);
    kafkaService = module.get(KafkaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateOTP', () => {
    it('generates a 6-digit OTP, hashes it and stores it in Redis', async () => {
      redisService.set.mockResolvedValue(undefined as any);

      const otp = await service.generateOTP({
        userId: 'user-1',
        purpose: OtpPurpose.FORGOT_PASSWORD,
      });

      expect(otp).toMatch(/^\d{6}$/);
      expect(bcrypt.hash).toHaveBeenCalledWith(
        otp,
        Number(process.env.SALT_ROUNDS),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `otp:${OtpPurpose.FORGOT_PASSWORD}:user-1`,
        'hashed-otp',
        expect.any(Number),
      );
    });

    it('stores with the correct TTL for reset-password purpose', async () => {
      redisService.set.mockResolvedValue(undefined as any);

      await service.generateOTP({
        userId: 'user-2',
        purpose: OtpPurpose.RESET_PASSWORD,
      });

      const [, , ttl] = (redisService.set as jest.Mock).mock.calls[0];
      expect(ttl).toBe(5 * 60);
    });
  });

  describe('sendOTP', () => {
    beforeEach(() => {
      redisService.set.mockResolvedValue(undefined as any);
    });

    it('emits forgot-password notification when purpose is forgot-password', async () => {
      await service.sendOTP('user@example.com', 'user-1', OtpPurpose.FORGOT_PASSWORD);

      expect(mockEmit).toHaveBeenCalledWith(
        NotificationTopics.ForgotPassword,
        expect.objectContaining({ to: 'user@example.com', code: expect.any(String) }),
      );
    });

    it('emits reset-password notification when purpose is reset-password', async () => {
      await service.sendOTP('user@example.com', 'user-1', OtpPurpose.RESET_PASSWORD);

      expect(mockEmit).toHaveBeenCalledWith(
        NotificationTopics.ResetPassword,
        expect.objectContaining({ to: 'user@example.com', code: expect.any(String) }),
      );
    });

    it('does not emit any notification for an unknown purpose', async () => {
      await service.sendOTP('user@example.com', 'user-1', 'unknown-purpose');

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('validateOTP', () => {
    it('returns false when no OTP is found in Redis', async () => {
      redisService.get.mockResolvedValue(null as any);

      const result = await service.validateOTP({
        userId: 'user-1',
        otp: '123456',
        purpose: OtpPurpose.FORGOT_PASSWORD,
      });

      expect(result).toBe(false);
      expect(redisService.delete).not.toHaveBeenCalled();
    });

    it('returns false when bcrypt compare fails', async () => {
      redisService.get.mockResolvedValue('hashed-otp' as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateOTP({
        userId: 'user-1',
        otp: 'wrong-otp',
        purpose: OtpPurpose.FORGOT_PASSWORD,
      });

      expect(result).toBe(false);
      expect(redisService.delete).not.toHaveBeenCalled();
    });

    it('returns true and deletes the OTP key when bcrypt compare succeeds', async () => {
      redisService.get.mockResolvedValue('hashed-otp' as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      redisService.delete.mockResolvedValue(undefined as any);

      const result = await service.validateOTP({
        userId: 'user-1',
        otp: '123456',
        purpose: OtpPurpose.FORGOT_PASSWORD,
      });

      expect(result).toBe(true);
      expect(redisService.delete).toHaveBeenCalledWith(
        `otp:${OtpPurpose.FORGOT_PASSWORD}:user-1`,
      );
    });

    it('uses the correct Redis key composed of purpose and userId', async () => {
      redisService.get.mockResolvedValue(null as any);

      await service.validateOTP({
        userId: 'abc',
        otp: '000000',
        purpose: OtpPurpose.RESET_PASSWORD,
      });

      expect(redisService.get).toHaveBeenCalledWith(
        `otp:${OtpPurpose.RESET_PASSWORD}:abc`,
      );
    });
  });
});
