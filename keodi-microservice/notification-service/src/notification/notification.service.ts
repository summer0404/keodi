import { HttpStatus, Injectable } from '@nestjs/common';
import { EmailService } from './channels/email.service';
import { SendForgetPasswordOTPMailDto } from 'src/dtos/email.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class NotificationService {
  constructor(private readonly emailService: EmailService) { }

  async sendForgotPasswordOTPByEmail(sendEmail: SendForgetPasswordOTPMailDto) {
    try {
      return await this.emailService.sendForgetPasswordOTPMail(sendEmail)
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
