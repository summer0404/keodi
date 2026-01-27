import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { getEmailSubject } from 'src/common/utils/email.helper';
import { SendOTPMailDto, SendVerifyURLDto } from 'src/common/dtos/email.dto';
import { EmailService } from 'src/providers/email/email.service';

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
