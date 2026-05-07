import { Controller } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  OwnerApplicationApprovedDto,
  OwnerApplicationReceivedDto,
  OwnerApplicationRejectedDto,
  OwnershipClaimApprovedDto,
  OwnershipClaimDisputedDto,
  OwnershipClaimRejectedDto,
  OwnershipRevokedDto,
  ReviewFlagApprovedDto,
  ReviewFlagRejectedDto,
  ReviewLowRatingDto,
  SendOTPDto,
  SendVerifyURLDto,
} from 'src/shared/dtos/email.dto';
import { NotificationTopics } from 'src/shared/constants/topic.contant';
import { EmailPurpose } from 'src/shared/enums/email.enum';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(NotificationTopics.ForgotPassword)
  async forgotPassword(@Payload() data: SendOTPDto) {
    return await this.notificationService.sendHtmlEmail(
      data,
      EmailPurpose.FORGOT_PASSWORD,
    );
  }

  @EventPattern(NotificationTopics.ResetPassword)
  async resetPassword(@Payload() data: SendOTPDto) {
    return await this.notificationService.sendHtmlEmail(
      data,
      EmailPurpose.RESET_PASSWORD,
    );
  }

  @EventPattern(NotificationTopics.VerifyEmail)
  async verifyEmail(@Payload() data: SendVerifyURLDto) {
    return await this.notificationService.sendHtmlEmail(
      data,
      EmailPurpose.VERIFY_EMAIL,
    );
  }

  @EventPattern(NotificationTopics.OwnerApplicationReceived)
  async ownerApplicationReceived(@Payload() data: OwnerApplicationReceivedDto) {
    return await this.notificationService.sendHtmlEmail(
      data,
      EmailPurpose.OWNER_APPLICATION_RECEIVED,
    );
  }

  @EventPattern(NotificationTopics.OwnerApplicationApproved)
  async ownerApplicationApproved(@Payload() data: OwnerApplicationApprovedDto) {
    return await this.notificationService.sendHtmlEmail(
      data,
      EmailPurpose.OWNER_APPLICATION_APPROVED,
    );
  }

  @EventPattern(NotificationTopics.OwnerApplicationRejected)
  async ownerApplicationRejected(@Payload() data: OwnerApplicationRejectedDto) {
    return await this.notificationService.sendHtmlEmail(
      data,
      EmailPurpose.OWNER_APPLICATION_REJECTED,
    );
  }

  @EventPattern(NotificationTopics.OwnershipClaimApproved)
  async ownershipClaimApproved(@Payload() data: OwnershipClaimApprovedDto) {
    return await this.notificationService.sendOwnershipClaimApprovedEmail(data);
  }

  @EventPattern(NotificationTopics.OwnershipClaimRejected)
  async ownershipClaimRejected(@Payload() data: OwnershipClaimRejectedDto) {
    return await this.notificationService.sendOwnershipClaimRejectedEmail(data);
  }

  @EventPattern(NotificationTopics.OwnershipRevoked)
  async ownershipRevoked(@Payload() data: OwnershipRevokedDto) {
    return await this.notificationService.sendOwnershipRevokedEmail(data);
  }

  @EventPattern(NotificationTopics.OwnershipClaimDisputed)
  async ownershipClaimDisputed(@Payload() data: OwnershipClaimDisputedDto) {
    return await this.notificationService.sendOwnershipClaimDisputedEmail(data);
  }

  @EventPattern(NotificationTopics.ReviewFlagApproved)
  async reviewFlagApproved(@Payload() data: ReviewFlagApprovedDto) {
    return await this.notificationService.sendReviewFlagApprovedEmail(data);
  }

  @EventPattern(NotificationTopics.ReviewFlagRejected)
  async reviewFlagRejected(@Payload() data: ReviewFlagRejectedDto) {
    return await this.notificationService.sendReviewFlagRejectedEmail(data);
  }

  @EventPattern(NotificationTopics.ReviewLowRating)
  async reviewLowRating(@Payload() data: ReviewLowRatingDto) {
    return await this.notificationService.sendReviewLowRatingNotification(data);
  }
}
