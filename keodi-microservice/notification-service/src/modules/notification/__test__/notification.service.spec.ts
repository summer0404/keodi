import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { NotificationService } from '../notification.service';
import { EmailService } from 'src/providers/email/email.service';
import { NotificationHelper } from '../notification.helper';
import { PrismaService } from 'src/database/prisma.service';
import { EmailPurpose, EmailSubject } from 'src/shared/enums/email.enum';
import {
  OwnershipClaimApprovedDto,
  OwnershipClaimDisputedDto,
  OwnershipClaimRejectedDto,
  OwnershipRevokedDto,
} from 'src/shared/dtos/email.dto';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailService: jest.Mocked<EmailService>;
  let notificationHelper: jest.Mocked<NotificationHelper>;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EmailService,
          useValue: {
            sendTransactionalEmail: jest.fn(),
          },
        },
        {
          provide: NotificationHelper,
          useValue: {
            getEmailSubject: jest.fn(),
            getEmailContent: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailService = module.get(EmailService);
    notificationHelper = module.get(NotificationHelper);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- sendHtmlEmail ----

  describe('sendHtmlEmail', () => {
    it('calls emailService.sendTransactionalEmail with derived subject and content', async () => {
      notificationHelper.getEmailSubject.mockReturnValue(EmailSubject.FORGOT_PASSWORD);
      notificationHelper.getEmailContent.mockReturnValue('<html>content</html>');
      emailService.sendTransactionalEmail.mockResolvedValue(undefined);

      const dto = { to: 'user@example.com', code: '123456' } as any;
      await service.sendHtmlEmail(dto, EmailPurpose.FORGOT_PASSWORD);

      expect(notificationHelper.getEmailSubject).toHaveBeenCalledWith(EmailPurpose.FORGOT_PASSWORD);
      expect(notificationHelper.getEmailContent).toHaveBeenCalledWith(EmailPurpose.FORGOT_PASSWORD, dto);
      expect(emailService.sendTransactionalEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: EmailSubject.FORGOT_PASSWORD,
        htmlContent: '<html>content</html>',
      });
    });

    it('propagates errors via handleServiceErrorCatching', async () => {
      notificationHelper.getEmailSubject.mockReturnValue(EmailSubject.FORGOT_PASSWORD);
      notificationHelper.getEmailContent.mockReturnValue('<html></html>');
      emailService.sendTransactionalEmail.mockRejectedValue(new Error('SMTP failure'));

      await expect(
        service.sendHtmlEmail({ to: 'user@example.com' } as any, EmailPurpose.FORGOT_PASSWORD),
      ).rejects.toThrow(RpcException);
    });

    it('re-throws RpcException unchanged', async () => {
      notificationHelper.getEmailSubject.mockReturnValue(EmailSubject.RESET_PASSWORD);
      notificationHelper.getEmailContent.mockReturnValue('');
      const rpc = new RpcException({ status: 500, message: 'rpc error' });
      emailService.sendTransactionalEmail.mockRejectedValue(rpc);

      await expect(
        service.sendHtmlEmail({ to: 'a@b.com' } as any, EmailPurpose.RESET_PASSWORD),
      ).rejects.toThrow(rpc);
    });
  });

  // ---- sendOwnershipClaimApprovedEmail ----

  describe('sendOwnershipClaimApprovedEmail', () => {
    it('looks up user email and delegates to sendHtmlEmail', async () => {
      prismaService.user.findUnique.mockResolvedValue({ email: 'owner@example.com' });
      notificationHelper.getEmailSubject.mockReturnValue(EmailSubject.OWNERSHIP_CLAIM_APPROVED);
      notificationHelper.getEmailContent.mockReturnValue('<html></html>');
      emailService.sendTransactionalEmail.mockResolvedValue(undefined);

      const dto: OwnershipClaimApprovedDto = { to: 'user-id-1' } as any;
      await service.sendOwnershipClaimApprovedEmail(dto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-1' },
        select: { email: true },
      });
      expect(emailService.sendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'owner@example.com' }),
      );
    });

    it('returns early and does not send email when user email is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await service.sendOwnershipClaimApprovedEmail({ to: 'missing-user' } as any);

      expect(emailService.sendTransactionalEmail).not.toHaveBeenCalled();
    });

    it('returns early when user record has no email field', async () => {
      prismaService.user.findUnique.mockResolvedValue({ email: null });

      await service.sendOwnershipClaimApprovedEmail({ to: 'no-email-user' } as any);

      expect(emailService.sendTransactionalEmail).not.toHaveBeenCalled();
    });
  });

  // ---- sendOwnershipClaimRejectedEmail ----

  describe('sendOwnershipClaimRejectedEmail', () => {
    it('sends rejection email with reason when user is found', async () => {
      prismaService.user.findUnique.mockResolvedValue({ email: 'owner@example.com' });
      notificationHelper.getEmailSubject.mockReturnValue(EmailSubject.OWNERSHIP_CLAIM_REJECTED);
      notificationHelper.getEmailContent.mockReturnValue('<html></html>');
      emailService.sendTransactionalEmail.mockResolvedValue(undefined);

      const dto: OwnershipClaimRejectedDto = { to: 'user-id-2', reason: 'Duplicate' } as any;
      await service.sendOwnershipClaimRejectedEmail(dto);

      expect(emailService.sendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'owner@example.com' }),
      );
    });

    it('skips sending when user email not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await service.sendOwnershipClaimRejectedEmail({ to: 'x', reason: 'r' } as any);

      expect(emailService.sendTransactionalEmail).not.toHaveBeenCalled();
    });
  });

  // ---- sendOwnershipRevokedEmail ----

  describe('sendOwnershipRevokedEmail', () => {
    it('sends revocation email with placeName when user is found', async () => {
      prismaService.user.findUnique.mockResolvedValue({ email: 'owner@example.com' });
      notificationHelper.getEmailSubject.mockReturnValue(EmailSubject.OWNERSHIP_REVOKED);
      notificationHelper.getEmailContent.mockReturnValue('<html></html>');
      emailService.sendTransactionalEmail.mockResolvedValue(undefined);

      const dto: OwnershipRevokedDto = { to: 'user-id-3', placeName: 'Cafe ABC' } as any;
      await service.sendOwnershipRevokedEmail(dto);

      expect(emailService.sendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'owner@example.com' }),
      );
    });

    it('skips sending when user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await service.sendOwnershipRevokedEmail({ to: 'x', placeName: 'Place' } as any);

      expect(emailService.sendTransactionalEmail).not.toHaveBeenCalled();
    });
  });

  // ---- sendOwnershipClaimDisputedEmail ----

  describe('sendOwnershipClaimDisputedEmail', () => {
    it('sends dispute email with placeName when user is found', async () => {
      prismaService.user.findUnique.mockResolvedValue({ email: 'owner@example.com' });
      notificationHelper.getEmailSubject.mockReturnValue(EmailSubject.OWNERSHIP_CLAIM_DISPUTED);
      notificationHelper.getEmailContent.mockReturnValue('<html></html>');
      emailService.sendTransactionalEmail.mockResolvedValue(undefined);

      const dto: OwnershipClaimDisputedDto = { to: 'user-id-4', placeName: 'Pho Shop' } as any;
      await service.sendOwnershipClaimDisputedEmail(dto);

      expect(emailService.sendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'owner@example.com' }),
      );
    });

    it('skips sending when user email not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await service.sendOwnershipClaimDisputedEmail({ to: 'x', placeName: 'p' } as any);

      expect(emailService.sendTransactionalEmail).not.toHaveBeenCalled();
    });
  });
});
