import { Controller } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SendOTPMailDto, SendVerifyURLDto } from 'src/shared/dtos/email.dto';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';
import { NotificationTopics } from 'src/shared/constants/topic.contant';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(NotificationTopics.ForgotPassword)
  async forgotPassword(@Payload() data: SendOTPMailDto) {
    return await this.notificationService.sendOTPByEmail(
      data,
      OtpPurpose.FORGOT_PASSWORD,
    );
  }

  @EventPattern(NotificationTopics.ResetPassword)
  async resetPassword(@Payload() data: SendOTPMailDto) {
    return await this.notificationService.sendOTPByEmail(
      data,
      OtpPurpose.RESET_PASSWORD,
    );
  }

  @EventPattern(NotificationTopics.VerifyEmail)
  async verifyEmail(@Payload() data: SendVerifyURLDto) {
    return await this.notificationService.sendVerifyURLByEmail(
      data,
      VerifyUrlPurpose.VERIFY_EMAIL,
    );
  }
}
