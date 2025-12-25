import { Controller } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OtpPurpose } from 'src/enums/otp.enum';
import { VerifyUrlPurpose } from 'src/enums/verifyUrl.enum';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @EventPattern('notification.forgot-password')
  async forgotPassword(@Payload() data: any) {
    return await this.notificationService.sendOTPByEmail(data, OtpPurpose.FORGOT_PASSWORD)
  }

  @EventPattern('notification.reset-password')
  async resetPassword(@Payload() data: any) {
    return await this.notificationService.sendOTPByEmail(data, OtpPurpose.RESET_PASSWORD)
  }

  @EventPattern('notification.verify-email')
  async verifyEmail(@Payload() data: any) {
    return await this.notificationService.sendVerifyURLByEmail(data, VerifyUrlPurpose.VERIFY_EMAIL)
  }
}
