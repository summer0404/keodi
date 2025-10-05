import { HttpStatus, Injectable } from '@nestjs/common';
import { EmailService } from './channels/email.service';
import { SendOTPMailDto, SendVerifyURLDto } from 'src/dtos/email.dto';
import { RpcException } from '@nestjs/microservices';
import { getEmailSubject } from 'src/utils/email.helper';

@Injectable()
export class NotificationService {
  constructor(private readonly emailService: EmailService) { }

  async sendOTPByEmail(sendEmail: SendOTPMailDto, purpose: string) {
    try {
      return await this.emailService.sendOTPMail({ ...sendEmail, subject: getEmailSubject(purpose) });
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
      return await this.emailService.sendVerifyURL({ ...sendEmail, subject: getEmailSubject(purpose) });
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
