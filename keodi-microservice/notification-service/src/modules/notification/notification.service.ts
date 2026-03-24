import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { SendOTPMailDto, SendVerifyURLDto } from 'src/shared/dtos/email.dto';
import { EmailService } from 'src/providers/email/email.service';
import { NotificationHelper } from './notification.helper';

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
      console.error(error)
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error
      })
    }
  }

  async sendVerifyURLByEmail(sendEmail: SendVerifyURLDto, purpose: string) {
    try {
      return await this.emailService.sendVerifyURL({ ...sendEmail, subject: this.notificationHelper.getEmailSubject(purpose) });
    } catch (error) {
      console.error(error)
      if (error instanceof RpcException) {
        throw error;  
      }
      throw new RpcException({
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error
      })
    }
  }
}
