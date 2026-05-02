import { Test, TestingModule } from '@nestjs/testing';
import { NotificationHelper } from '../notification.helper';
import { RedisService } from 'src/providers/redis/redis.service';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import { EmailPurpose, EmailSubject } from 'src/shared/enums/email.enum';
import {
  SendOTPDto,
  SendVerifyURLDto,
  OwnerApplicationReceivedDto,
  OwnerApplicationRejectedDto,
  OwnershipClaimRejectedDto,
  OwnershipRevokedDto,
  OwnershipClaimDisputedDto,
} from 'src/shared/dtos/email.dto';

describe('NotificationHelper', () => {
  let helper: NotificationHelper;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationHelper,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    helper = module.get<NotificationHelper>(NotificationHelper);
    redisService = module.get(RedisService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- isOnline ----

  describe('isOnline', () => {
    it('returns true when Redis returns "online"', async () => {
      redisService.get.mockResolvedValue('online');
      const result = await helper.isOnline('user-1');
      expect(redisService.get).toHaveBeenCalledWith(RedisKeys.PRESENCE('user-1'));
      expect(result).toBe(true);
    });

    it('returns false when Redis returns null', async () => {
      redisService.get.mockResolvedValue(null);
      expect(await helper.isOnline('user-2')).toBe(false);
    });

    it('returns false when Redis returns any string other than "online"', async () => {
      redisService.get.mockResolvedValue('offline');
      expect(await helper.isOnline('user-3')).toBe(false);
    });
  });

  // ---- getEmailSubject ----

  describe('getEmailSubject', () => {
    it.each([
      [EmailPurpose.FORGOT_PASSWORD, EmailSubject.FORGOT_PASSWORD],
      [EmailPurpose.RESET_PASSWORD, EmailSubject.RESET_PASSWORD],
      [EmailPurpose.VERIFY_EMAIL, EmailSubject.VERIFY_EMAIL],
      [EmailPurpose.OWNER_APPLICATION_RECEIVED, EmailSubject.OWNER_APPLICATION_RECEIVED],
      [EmailPurpose.OWNER_APPLICATION_APPROVED, EmailSubject.OWNER_APPLICATION_APPROVED],
      [EmailPurpose.OWNER_APPLICATION_REJECTED, EmailSubject.OWNER_APPLICATION_REJECTED],
      [EmailPurpose.OWNERSHIP_CLAIM_APPROVED, EmailSubject.OWNERSHIP_CLAIM_APPROVED],
      [EmailPurpose.OWNERSHIP_CLAIM_REJECTED, EmailSubject.OWNERSHIP_CLAIM_REJECTED],
      [EmailPurpose.OWNERSHIP_REVOKED, EmailSubject.OWNERSHIP_REVOKED],
      [EmailPurpose.OWNERSHIP_CLAIM_DISPUTED, EmailSubject.OWNERSHIP_CLAIM_DISPUTED],
    ])('maps purpose %s to subject %s', (purpose, expected) => {
      expect(helper.getEmailSubject(purpose)).toBe(expected);
    });
  });

  // ---- getEmailContent ----

  describe('getEmailContent', () => {
    it('returns HTML content for FORGOT_PASSWORD with OTP code', () => {
      const dto = { to: 'a@b.com', code: '123456' } as SendOTPDto;
      const content = helper.getEmailContent(EmailPurpose.FORGOT_PASSWORD, dto);
      expect(typeof content).toBe('string');
      expect(content).toContain('123456');
    });

    it('returns HTML content for RESET_PASSWORD with OTP code', () => {
      const dto = { to: 'a@b.com', code: '654321' } as SendOTPDto;
      const content = helper.getEmailContent(EmailPurpose.RESET_PASSWORD, dto);
      expect(content).toContain('654321');
    });

    it('returns HTML content for VERIFY_EMAIL with URL', () => {
      const dto = { to: 'a@b.com', url: 'https://verify.example.com' } as SendVerifyURLDto;
      const content = helper.getEmailContent(EmailPurpose.VERIFY_EMAIL, dto);
      expect(content).toContain('https://verify.example.com');
    });

    it('returns HTML content for OWNER_APPLICATION_RECEIVED with businessDays', () => {
      const dto = { to: 'a@b.com', businessDays: 5 } as OwnerApplicationReceivedDto;
      const content = helper.getEmailContent(EmailPurpose.OWNER_APPLICATION_RECEIVED, dto);
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('returns HTML content for OWNER_APPLICATION_APPROVED', () => {
      const dto = { to: 'a@b.com' } as any;
      const content = helper.getEmailContent(EmailPurpose.OWNER_APPLICATION_APPROVED, dto);
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('returns HTML content for OWNER_APPLICATION_REJECTED with reason', () => {
      const dto = { to: 'a@b.com', reason: 'Invalid documents' } as OwnerApplicationRejectedDto;
      const content = helper.getEmailContent(EmailPurpose.OWNER_APPLICATION_REJECTED, dto);
      expect(content).toContain('Invalid documents');
    });

    it('returns HTML content for OWNERSHIP_CLAIM_APPROVED', () => {
      const dto = { to: 'a@b.com' } as any;
      const content = helper.getEmailContent(EmailPurpose.OWNERSHIP_CLAIM_APPROVED, dto);
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('returns HTML content for OWNERSHIP_CLAIM_REJECTED with reason', () => {
      const dto = { to: 'a@b.com', reason: 'Duplicate claim' } as OwnershipClaimRejectedDto;
      const content = helper.getEmailContent(EmailPurpose.OWNERSHIP_CLAIM_REJECTED, dto);
      expect(content).toContain('Duplicate claim');
    });

    it('returns HTML content for OWNERSHIP_REVOKED with placeName', () => {
      const dto = { to: 'a@b.com', placeName: 'Cafe Nguyen' } as OwnershipRevokedDto;
      const content = helper.getEmailContent(EmailPurpose.OWNERSHIP_REVOKED, dto);
      expect(content).toContain('Cafe Nguyen');
    });

    it('returns HTML content for OWNERSHIP_CLAIM_DISPUTED with placeName', () => {
      const dto = { to: 'a@b.com', placeName: 'Pho Restaurant' } as OwnershipClaimDisputedDto;
      const content = helper.getEmailContent(EmailPurpose.OWNERSHIP_CLAIM_DISPUTED, dto);
      expect(content).toContain('Pho Restaurant');
    });
  });
});
