import { Inject, Injectable } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { GenerateOTPDto, ValidateOTPDto } from "src/dtos/otp.dto";
import { randomInt } from "crypto";
import * as bcrypt from 'bcrypt'
import { ClientKafka } from "@nestjs/microservices";
import { OtpPurpose } from "src/enums/otp.enum";
import { getTTLForPurpose } from "src/utils/ttl-redis.helper";

@Injectable()
export class OtpService {
    constructor(
        private readonly redisService: RedisService,
        @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientKafka
    ) { }

    async generateOTP(generateOTPDto: GenerateOTPDto) {
        const otp = String(randomInt(100000, 999999))
        await this.redisService.set(
            `otp:${generateOTPDto.purpose}:${generateOTPDto.userId}`, //key
            await bcrypt.hash(otp, Number(process.env.SALT_ROUNDS)), // otp đã được hash
            getTTLForPurpose(generateOTPDto.purpose) // Thời gian tồn tại
        )

        return otp
    }

    async sendOTP(email: string, userId: number, purpose: string) {
        const otp = await this.generateOTP({
            userId,
            purpose
        })

        switch (purpose) {
            case OtpPurpose.FORGOT_PASSWORD:
                this.notificationClient.emit('notification.forgot-password', { to: email, code: otp })
                break
            case OtpPurpose.RESET_PASSWORD:
                this.notificationClient.emit('notification.reset-password', { to: email, code: otp })
                break
            default:
                break
        }
    }

    async validateOTP(validateOTPDto: ValidateOTPDto): Promise<boolean> {
        const otp = await this.redisService.get(`otp:${validateOTPDto.purpose}:${validateOTPDto.userId}`)

        if (!otp) return false

        if (!(await bcrypt.compare(validateOTPDto.otp, otp))) return false

        await this.redisService.delete(`otp:${validateOTPDto.purpose}:${validateOTPDto.userId}`)
        return true
    }
}