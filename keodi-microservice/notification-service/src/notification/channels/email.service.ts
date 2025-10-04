import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer"
import { SendOTPMailDto } from "src/dtos/email.dto";
import forgotPasswordTemplate from "./templates/forgot-password.template";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name)
    private transporter: any

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.BREVO_HOST,
            port: Number(process.env.BREVO_PORT),
            secure: false,
            auth: {
                user: process.env.BREVO_USER,
                pass: process.env.BREVO_PASS,
            },
        } as nodemailer.TransportOptions)
    }

    async sendOTPMail(sendMailDto: SendOTPMailDto) {
        try {
            await this.transporter.sendMail({
                from: `"Keodi Authentication" <${process.env.BREVO_SMTP_USER}>`,
                to: sendMailDto.to,
                subject: sendMailDto.subject,
                html: forgotPasswordTemplate(sendMailDto.code)
            })

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
}