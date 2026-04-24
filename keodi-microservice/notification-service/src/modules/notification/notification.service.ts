import { Injectable, Logger } from '@nestjs/common';
import { EmailPayloadDto, OwnershipClaimApprovedDto, OwnershipClaimDisputedDto, OwnershipClaimRejectedDto, OwnershipRevokedDto } from 'src/shared/dtos/email.dto';
import { EmailService } from 'src/providers/email/email.service';
import { NotificationHelper } from './notification.helper';
import { handleServiceErrorCatching } from 'src/shared/utils/error.utils';
import { EmailPurpose } from 'src/shared/enums/email.enum';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationHelper: NotificationHelper,
    private readonly prismaService: PrismaService,
  ) { }

  async sendHtmlEmail(
    sendMailDto: EmailPayloadDto,
    purpose: EmailPurpose,
  ) {
    try {
      return await this.emailService.sendTransactionalEmail({
        to: sendMailDto.to,
        subject: this.notificationHelper.getEmailSubject(purpose),
        htmlContent: this.notificationHelper.getEmailContent(purpose, sendMailDto),
      });
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async sendOwnershipClaimApprovedEmail(data: OwnershipClaimApprovedDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.to },
      select: { email: true },
    });

    if (!user?.email) {
      this.logger.warn(`User ${data.to} email not found for owership claim approval`);
      return;
    }

    return await this.sendHtmlEmail(
      { to: user.email } as OwnershipClaimApprovedDto,
      EmailPurpose.OWNERSHIP_CLAIM_APPROVED,
    );
  }

  async sendOwnershipClaimRejectedEmail(data: OwnershipClaimRejectedDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.to },
      select: { email: true },
    });


    if (!user?.email) {
      this.logger.warn(`User ${data.to} email not found for ownership claim rejection`);
      return;
    }

    return await this.sendHtmlEmail(
      { to: user.email, reason: data.reason } as OwnershipClaimRejectedDto,
      EmailPurpose.OWNERSHIP_CLAIM_REJECTED,
    );
  }

  async sendOwnershipRevokedEmail(data: OwnershipRevokedDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.to },
      select: { email: true },
    });

    if (!user?.email) {
      this.logger.warn(`User ${data.to} email not found for ownership revocation notification`);
      return;
    }

    return await this.sendHtmlEmail(
      { to: user.email, placeName: data.placeName } as OwnershipRevokedDto,
      EmailPurpose.OWNERSHIP_REVOKED,
    );
  }

  async sendOwnershipClaimDisputedEmail(data: OwnershipClaimDisputedDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.to },
      select: { email: true },
    });

    if (!user?.email) {
      this.logger.warn(`User ${data.to} email not found for ownership dispute notification`);
      return;
    }

    return await this.sendHtmlEmail(
      { to: user.email, placeName: data.placeName } as OwnershipClaimDisputedDto,
      EmailPurpose.OWNERSHIP_CLAIM_DISPUTED,
    );
  }
}
