import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import * as SibApiV3Sdk from "@getbrevo/brevo"
import { SendOTPMailDto, SendVerifyURLDto } from "src/dtos/email.dto";
import forgotPasswordTemplate from "./templates/forgot-password.template";
import { RpcException } from "@nestjs/microservices";
import verifyAccountTemplate from "./templates/verify-account.template";

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

    async sendOTPMail(sendMailDto: SendOTPMailDto) {
        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.sender = {
                email: process.env.BREVO_SMTP_USER,
                name: "Keodi Authentication"
            }
            sendSmtpEmail.to = [{ email: sendMailDto.to }]
            sendSmtpEmail.subject = sendMailDto.subject
            sendSmtpEmail.htmlContent = forgotPasswordTemplate(sendMailDto.code)

            await this.apiInstance.sendTransacEmail(sendSmtpEmail)

            this.logger.log(`OTP sent to ${sendMailDto.to}`)
        } catch (error) {
            this.logger.log(`Failed to send OTP to ${sendMailDto.to}`)
            console.log(error)
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error when sending OTP mail to user'
            })
        }
    }

    async sendVerifyURL(sendMailDto: SendVerifyURLDto) {
        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.sender = {
                name: "Keodi Authentication",
                email: process.env.BREVO_SMTP_USER
            };
            sendSmtpEmail.to = [{ email: sendMailDto.to }];
            sendSmtpEmail.subject = sendMailDto.subject;
            sendSmtpEmail.htmlContent = verifyAccountTemplate(sendMailDto.url);

            await this.apiInstance.sendTransacEmail(sendSmtpEmail);

            this.logger.log(`Verification URL sent to ${sendMailDto.to}`)
        } catch (error) {
            this.logger.log(`Failed to send verification URL to ${sendMailDto.to}`)
            console.log(error)
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error when sending verification URL mail to user'
            })
        }
    }
}