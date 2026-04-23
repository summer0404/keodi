import { Injectable } from '@nestjs/common';
import { EmailPayloadDto } from 'src/shared/dtos/email.dto';
import { EmailService } from 'src/providers/email/email.service';
import { NotificationHelper } from './notification.helper';
import { handleServiceErrorCatching } from 'src/shared/utils/error.utils';
import { EmailPurpose } from 'src/shared/enums/email.enum';

@Injectable()
export class NotificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly notificationHelper: NotificationHelper,
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
}
