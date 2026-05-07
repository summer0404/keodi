import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/providers/redis/redis.service';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import {
  EmailPayloadDto,
  OwnerApplicationReceivedDto,
  OwnerApplicationRejectedDto,
  OwnershipClaimApprovedDto,
  OwnershipClaimDisputedDto,
  OwnershipClaimRejectedDto,
  OwnershipRevokedDto,
  ReviewFlagApprovedDto,
  ReviewFlagRejectedDto,
  SendOTPDto,
  SendVerifyURLDto,
} from 'src/shared/dtos/email.dto';
import { EmailPurpose, EmailSubject } from 'src/shared/enums/email.enum';
import forgotPasswordTemplate from 'src/shared/templates/forgot-password.template';
import ownerApplicationApprovedTemplate from 'src/shared/templates/owner-application-approved.template';
import ownerApplicationReceivedTemplate from 'src/shared/templates/owner-application-received.template';
import ownerApplicationRejectedTemplate from 'src/shared/templates/owner-application-rejected.template';
import ownershipClaimApprovedTemplate from 'src/shared/templates/ownership-claim-approved.template';
import ownershipClaimDisputedTemplate from 'src/shared/templates/ownership-claim-disputed.template';
import ownershipClaimRejectedTemplate from 'src/shared/templates/ownership-claim-rejected.template';
import ownershipRevokedTemplate from 'src/shared/templates/ownership-revoked.template';
import resetPasswordTemplate from 'src/shared/templates/reset-password.template';
import verifyAccountTemplate from 'src/shared/templates/verify-account.template';
import reviewFlagApprovedTemplate from 'src/shared/templates/review-flag-approved.template';
import reviewFlagRejectedTemplate from 'src/shared/templates/review-flag-rejected.template';
import lowRatingReviewTemplate from 'src/shared/templates/low-rating-review.template';

@Injectable()
export class NotificationHelper {
  constructor(private readonly redisService: RedisService) {}

  async isOnline(userId: string): Promise<boolean> {
    const val = await this.redisService.get(RedisKeys.PRESENCE(userId));
    return val === 'online';
  }

  getEmailSubject = (purpose: EmailPurpose): EmailSubject => {
    switch (purpose) {
      case EmailPurpose.FORGOT_PASSWORD:
        return EmailSubject.FORGOT_PASSWORD;
      case EmailPurpose.RESET_PASSWORD:
        return EmailSubject.RESET_PASSWORD;
      case EmailPurpose.VERIFY_EMAIL:
        return EmailSubject.VERIFY_EMAIL;
      case EmailPurpose.OWNER_APPLICATION_RECEIVED:
        return EmailSubject.OWNER_APPLICATION_RECEIVED;
      case EmailPurpose.OWNER_APPLICATION_APPROVED:
        return EmailSubject.OWNER_APPLICATION_APPROVED;
      case EmailPurpose.OWNER_APPLICATION_REJECTED:
        return EmailSubject.OWNER_APPLICATION_REJECTED;
      case EmailPurpose.OWNERSHIP_CLAIM_APPROVED:
        return EmailSubject.OWNERSHIP_CLAIM_APPROVED;
      case EmailPurpose.OWNERSHIP_CLAIM_REJECTED:
        return EmailSubject.OWNERSHIP_CLAIM_REJECTED;
      case EmailPurpose.OWNERSHIP_REVOKED:
        return EmailSubject.OWNERSHIP_REVOKED;
      case EmailPurpose.OWNERSHIP_CLAIM_DISPUTED:
        return EmailSubject.OWNERSHIP_CLAIM_DISPUTED;
      case EmailPurpose.REVIEW_FLAG_APPROVED:
        return EmailSubject.REVIEW_FLAG_APPROVED;
      case EmailPurpose.REVIEW_FLAG_REJECTED:
        return EmailSubject.REVIEW_FLAG_REJECTED;
      case EmailPurpose.REVIEW_LOW_RATING:
        return EmailSubject.REVIEW_LOW_RATING;
    }
  };

  getEmailContent = (purpose: EmailPurpose, data: EmailPayloadDto): string => {
    switch (purpose) {
      case EmailPurpose.FORGOT_PASSWORD:
        return forgotPasswordTemplate((data as SendOTPDto).code);
      case EmailPurpose.RESET_PASSWORD:
        return resetPasswordTemplate((data as SendOTPDto).code);
      case EmailPurpose.VERIFY_EMAIL:
        return verifyAccountTemplate((data as SendVerifyURLDto).url);
      case EmailPurpose.OWNER_APPLICATION_RECEIVED:
        return ownerApplicationReceivedTemplate(
          (data as OwnerApplicationReceivedDto).businessDays,
        );
      case EmailPurpose.OWNER_APPLICATION_APPROVED:
        return ownerApplicationApprovedTemplate();
      case EmailPurpose.OWNER_APPLICATION_REJECTED:
        return ownerApplicationRejectedTemplate(
          (data as OwnerApplicationRejectedDto).reason,
        );
      case EmailPurpose.OWNERSHIP_CLAIM_APPROVED:
        return ownershipClaimApprovedTemplate();
      case EmailPurpose.OWNERSHIP_CLAIM_REJECTED:
        return ownershipClaimRejectedTemplate(
          (data as OwnershipClaimRejectedDto).reason,
        );
      case EmailPurpose.OWNERSHIP_REVOKED:
        return ownershipRevokedTemplate(
          (data as OwnershipRevokedDto).placeName,
        );
      case EmailPurpose.OWNERSHIP_CLAIM_DISPUTED:
        return ownershipClaimDisputedTemplate(
          (data as OwnershipClaimDisputedDto).placeName,
        );
      case EmailPurpose.REVIEW_FLAG_APPROVED:
        return reviewFlagApprovedTemplate(
          (data as ReviewFlagApprovedDto).placeName,
        );
      case EmailPurpose.REVIEW_FLAG_REJECTED:
        return reviewFlagRejectedTemplate(
          (data as ReviewFlagRejectedDto).placeName,
        );
      // REVIEW_LOW_RATING is handled separately in NotificationService (not via getEmailContent)
    }
  };
}
