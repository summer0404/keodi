import { Controller } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SendOTPMailDto, SendVerifyURLDto } from 'src/common/dtos/email.dto';
import { OtpPurpose } from 'src/common/enums/otp.enum';
import { VerifyUrlPurpose } from 'src/common/enums/verifyUrl.enum';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @EventPattern('notification.forgot-password')
  async forgotPassword(@Payload() data: SendOTPMailDto) {
    return await this.notificationService.sendOTPByEmail(data, OtpPurpose.FORGOT_PASSWORD)
  }

  @EventPattern('notification.reset-password')
  async resetPassword(@Payload() data: SendOTPMailDto) {
    return await this.notificationService.sendOTPByEmail(data, OtpPurpose.RESET_PASSWORD)
  }

  @EventPattern('notification.verify-email')
  async verifyEmail(@Payload() data: SendVerifyURLDto) {
    return await this.notificationService.sendVerifyURLByEmail(data, VerifyUrlPurpose.VERIFY_EMAIL)
  }
}
