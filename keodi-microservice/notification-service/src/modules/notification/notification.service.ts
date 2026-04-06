import { Injectable } from '@nestjs/common';
import { SendOTPMailDto, SendVerifyURLDto } from 'src/shared/dtos/email.dto';
import { EmailService } from 'src/providers/email/email.service';
import { NotificationHelper } from './notification.helper';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';

@Injectable()
export class NotificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly notificationHelper: NotificationHelper
  ) { }

  async sendOTPByEmail(sendEmail: SendOTPMailDto, purpose: string) {
    try {
      return await this.emailService.sendOTPMail({ ...sendEmail, subject: this.notificationHelper.getEmailSubject(purpose) });
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async sendVerifyURLByEmail(sendEmail: SendVerifyURLDto, purpose: string) {
    try {
      return await this.emailService.sendVerifyURL({ ...sendEmail, subject: this.notificationHelper.getEmailSubject(purpose) });
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }
}
