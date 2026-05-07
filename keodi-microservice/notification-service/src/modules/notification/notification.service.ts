import { Injectable, Logger } from '@nestjs/common';
import {
  EmailPayloadDto,
  OwnershipClaimApprovedDto,
  OwnershipClaimDisputedDto,
  OwnershipClaimRejectedDto,
  OwnershipRevokedDto,
  ReviewFlagApprovedDto,
  ReviewFlagRejectedDto,
  ReviewLowRatingDto,
} from 'src/shared/dtos/email.dto';
import { EmailService } from 'src/providers/email/email.service';
import { NotificationHelper } from './notification.helper';
import { handleServiceErrorCatching } from 'src/shared/utils/error.utils';
import { EmailPurpose } from 'src/shared/enums/email.enum';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { NotificationTopics } from 'src/shared/constants/topic.contant';
import { NotificationPreferredChannel, NotificationType } from 'src/shared/enums/notification.enum';
import lowRatingReviewTemplate from 'src/shared/templates/low-rating-review.template';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationHelper: NotificationHelper,
    private readonly prismaService: PrismaService,
    private readonly kafkaService: KafkaService,
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

  async sendReviewFlagApprovedEmail(data: ReviewFlagApprovedDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.to },
      select: { email: true },
    });

    if (!user?.email) {
      this.logger.warn(`User ${data.to} email not found for review flag approved notification`);
      return;
    }

    return await this.sendHtmlEmail(
      { to: user.email, placeName: data.placeName, reviewId: data.reviewId } as ReviewFlagApprovedDto,
      EmailPurpose.REVIEW_FLAG_APPROVED,
    );
  }

  async sendReviewFlagRejectedEmail(data: ReviewFlagRejectedDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.to },
      select: { email: true },
    });

    if (!user?.email) {
      this.logger.warn(`User ${data.to} email not found for review flag rejected notification`);
      return;
    }

    return await this.sendHtmlEmail(
      { to: user.email, placeName: data.placeName, reviewId: data.reviewId } as ReviewFlagRejectedDto,
      EmailPurpose.REVIEW_FLAG_REJECTED,
    );
  }

  async sendReviewLowRatingNotification(data: ReviewLowRatingDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.to },
      select: { email: true },
    });

    if (!user?.email) {
      this.logger.warn(`User ${data.to} email not found for low rating review notification`);
    } else {
      try {
        await this.emailService.sendTransactionalEmail({
          to: user.email,
          subject: this.notificationHelper.getEmailSubject(EmailPurpose.REVIEW_LOW_RATING),
          htmlContent: lowRatingReviewTemplate(data.reviewerName, data.rating, data.placeName),
        });
      } catch (error) {
        this.logger.error(`Failed to send low rating email to ${user.email}`, error);
      }
    }

    this.kafkaService.getClient().emit(NotificationTopics.Dispatch, {
      eventId: `review-low-rating-${data.reviewId}`,
      userId: data.to,
      type: NotificationType.REVIEW_LOW_RATING,
      title: `New ${data.rating}-star review on ${data.placeName}`,
      body: `${data.reviewerName} left a ${data.rating}-star review. Tap to respond.`,
      preferredChannel: NotificationPreferredChannel.BOTH,
      data: { placeId: data.placeId, reviewId: data.reviewId },
      createdAt: new Date().toISOString(),
    });
  }
}
