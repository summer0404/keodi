import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from '../notification.controller';
import { NotificationService } from '../notification.service';
import { EmailPurpose } from 'src/shared/enums/email.enum';
import {
  SendOTPDto,
  SendVerifyURLDto,
  OwnerApplicationReceivedDto,
  OwnerApplicationApprovedDto,
  OwnerApplicationRejectedDto,
  OwnershipClaimApprovedDto,
  OwnershipClaimDisputedDto,
  OwnershipClaimRejectedDto,
  OwnershipRevokedDto,
} from 'src/shared/dtos/email.dto';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            sendHtmlEmail: jest.fn(),
            sendOwnershipClaimApprovedEmail: jest.fn(),
            sendOwnershipClaimRejectedEmail: jest.fn(),
            sendOwnershipRevokedEmail: jest.fn(),
            sendOwnershipClaimDisputedEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('forgotPassword', () => {
    it('delegates to sendHtmlEmail with FORGOT_PASSWORD purpose', async () => {
      const dto: SendOTPDto = { to: 'user@example.com', code: '111111' };
      notificationService.sendHtmlEmail.mockResolvedValue(undefined);

      await controller.forgotPassword(dto);

      expect(notificationService.sendHtmlEmail).toHaveBeenCalledWith(dto, EmailPurpose.FORGOT_PASSWORD);
    });
  });

  describe('resetPassword', () => {
    it('delegates to sendHtmlEmail with RESET_PASSWORD purpose', async () => {
      const dto: SendOTPDto = { to: 'user@example.com', code: '222222' };
      notificationService.sendHtmlEmail.mockResolvedValue(undefined);

      await controller.resetPassword(dto);

      expect(notificationService.sendHtmlEmail).toHaveBeenCalledWith(dto, EmailPurpose.RESET_PASSWORD);
    });
  });

  describe('verifyEmail', () => {
    it('delegates to sendHtmlEmail with VERIFY_EMAIL purpose', async () => {
      const dto: SendVerifyURLDto = { to: 'user@example.com', url: 'https://verify.me' };
      notificationService.sendHtmlEmail.mockResolvedValue(undefined);

      await controller.verifyEmail(dto);

      expect(notificationService.sendHtmlEmail).toHaveBeenCalledWith(dto, EmailPurpose.VERIFY_EMAIL);
    });
  });

  describe('ownerApplicationReceived', () => {
    it('delegates to sendHtmlEmail with OWNER_APPLICATION_RECEIVED purpose', async () => {
      const dto: OwnerApplicationReceivedDto = { to: 'owner@example.com', businessDays: 3 };
      notificationService.sendHtmlEmail.mockResolvedValue(undefined);

      await controller.ownerApplicationReceived(dto);

      expect(notificationService.sendHtmlEmail).toHaveBeenCalledWith(dto, EmailPurpose.OWNER_APPLICATION_RECEIVED);
    });
  });

  describe('ownerApplicationApproved', () => {
    it('delegates to sendHtmlEmail with OWNER_APPLICATION_APPROVED purpose', async () => {
      const dto: OwnerApplicationApprovedDto = { to: 'owner@example.com' };
      notificationService.sendHtmlEmail.mockResolvedValue(undefined);

      await controller.ownerApplicationApproved(dto);

      expect(notificationService.sendHtmlEmail).toHaveBeenCalledWith(dto, EmailPurpose.OWNER_APPLICATION_APPROVED);
    });
  });

  describe('ownerApplicationRejected', () => {
    it('delegates to sendHtmlEmail with OWNER_APPLICATION_REJECTED purpose', async () => {
      const dto: OwnerApplicationRejectedDto = { to: 'owner@example.com', reason: 'Incomplete docs' };
      notificationService.sendHtmlEmail.mockResolvedValue(undefined);

      await controller.ownerApplicationRejected(dto);

      expect(notificationService.sendHtmlEmail).toHaveBeenCalledWith(dto, EmailPurpose.OWNER_APPLICATION_REJECTED);
    });
  });

  describe('ownershipClaimApproved', () => {
    it('delegates to sendOwnershipClaimApprovedEmail', async () => {
      const dto: OwnershipClaimApprovedDto = { to: 'user-id-1' } as any;
      notificationService.sendOwnershipClaimApprovedEmail.mockResolvedValue(undefined);

      await controller.ownershipClaimApproved(dto);

      expect(notificationService.sendOwnershipClaimApprovedEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('ownershipClaimRejected', () => {
    it('delegates to sendOwnershipClaimRejectedEmail', async () => {
      const dto: OwnershipClaimRejectedDto = { to: 'user-id-2', reason: 'Dup' } as any;
      notificationService.sendOwnershipClaimRejectedEmail.mockResolvedValue(undefined);

      await controller.ownershipClaimRejected(dto);

      expect(notificationService.sendOwnershipClaimRejectedEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('ownershipRevoked', () => {
    it('delegates to sendOwnershipRevokedEmail', async () => {
      const dto: OwnershipRevokedDto = { to: 'user-id-3', placeName: 'Cafe' } as any;
      notificationService.sendOwnershipRevokedEmail.mockResolvedValue(undefined);

      await controller.ownershipRevoked(dto);

      expect(notificationService.sendOwnershipRevokedEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('ownershipClaimDisputed', () => {
    it('delegates to sendOwnershipClaimDisputedEmail', async () => {
      const dto: OwnershipClaimDisputedDto = { to: 'user-id-4', placeName: 'Pho' } as any;
      notificationService.sendOwnershipClaimDisputedEmail.mockResolvedValue(undefined);

      await controller.ownershipClaimDisputed(dto);

      expect(notificationService.sendOwnershipClaimDisputedEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('return value passthrough', () => {
    it('returns the value produced by sendHtmlEmail', async () => {
      const dto: SendOTPDto = { to: 'user@example.com', code: '999' };
      const expected = { messageId: 'abc123' } as any;
      notificationService.sendHtmlEmail.mockResolvedValue(expected);

      const result = await controller.forgotPassword(dto);

      expect(result).toBe(expected);
    });
  });
});
