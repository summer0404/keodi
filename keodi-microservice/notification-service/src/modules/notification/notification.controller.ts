import { Controller } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import {
  OwnerApplicationApprovedDto,
  OwnerApplicationReceivedDto,
  OwnerApplicationRejectedDto,
  OwnershipClaimApprovedDto,
  OwnershipClaimRejectedDto,
  SendOTPDto,
  SendVerifyURLDto,
} from 'src/shared/dtos/email.dto';
import { NotificationTopics } from 'src/shared/constants/topic.contant';
import { EmailPurpose } from 'src/shared/enums/email.enum';

@Controller()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prismaService: PrismaService,
  ) {}

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
  async ownerApplicationReceived(
    @Payload() data: OwnerApplicationReceivedDto,
  ) {
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
  async ownerApplicationRejected(
    @Payload() data: OwnerApplicationRejectedDto,
  ) {
    return await this.notificationService.sendHtmlEmail(
      data,
      EmailPurpose.OWNER_APPLICATION_REJECTED,
    );
  }

  @EventPattern(NotificationTopics.OwnershipClaimApproved)
  async ownershipClaimApproved(@Payload() data: { userId: string, placeId: string }) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    if (!user?.email) return;

    return await this.notificationService.sendHtmlEmail(
      { to: user.email } as OwnershipClaimApprovedDto,
      EmailPurpose.OWNERSHIP_CLAIM_APPROVED,
    );
  }

  @EventPattern(NotificationTopics.OwnershipClaimRejected)
  async ownershipClaimRejected(
    @Payload() data: { userId: string, placeId: string, reason: string },
  ) {
    const user = await this.prismaService.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    if (!user?.email) return;

    return await this.notificationService.sendHtmlEmail(
      { to: user.email, reason: data.reason } as OwnershipClaimRejectedDto,
      EmailPurpose.OWNERSHIP_CLAIM_REJECTED,
    );
  }
}
