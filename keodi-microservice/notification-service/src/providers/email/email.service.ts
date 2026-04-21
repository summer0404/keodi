import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import * as SibApiV3Sdk from "@getbrevo/brevo"
import { RpcException } from "@nestjs/microservices";
import { NotificationErrorMessages } from "src/shared/constants/error.constant";
import { SendMailDto } from "src/shared/dtos/email.dto";

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name)
    private apiInstance: SibApiV3Sdk.TransactionalEmailsApi

    constructor() {
        if (!process.env.BREVO_API_KEY) {
            this.logger.error('BREVO_API_KEY is not defined in environment variables')
            return
        }

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        apiInstance.setApiKey(
            SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
            process.env.BREVO_API_KEY,
        )

        this.apiInstance = apiInstance
    }

    async sendTransactionalEmail(sendMailDto: SendMailDto & { subject: string, htmlContent: string }) {
        try {
            if (!this.apiInstance) {
                throw new RpcException({
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: NotificationErrorMessages.EMAIL_SEND_FAILED,
                });
            }

            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.sender = {
                name: "Keodi Authentication",
                email: process.env.BREVO_SMTP_USER,
            };
            sendSmtpEmail.to = [{ email: sendMailDto.to }];
            sendSmtpEmail.subject = sendMailDto.subject;
            sendSmtpEmail.htmlContent = sendMailDto.htmlContent;

            await this.apiInstance.sendTransacEmail(sendSmtpEmail);

            this.logger.log(`Email sent to ${sendMailDto.to}`);
        } catch (error) {
            this.logger.log(`Failed to send email to ${sendMailDto.to}`);
            this.logger.error(error.message ?? error, error.stack);
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: NotificationErrorMessages.EMAIL_SEND_FAILED,
            });
        }
    }
}
