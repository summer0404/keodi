import { Controller } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @EventPattern('notification.forgot-password')
  async forgotPassword(@Payload() data: any) {
    return await this.notificationService.sendForgotPasswordOTPByEmail(data)
  }
}
