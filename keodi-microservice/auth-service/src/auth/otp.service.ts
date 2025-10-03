import { Injectable } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { GenerateOTPDto, ValidateOTPDto } from "src/dtos/otp.dto";
import { randomInt } from "crypto";
import * as bcrypt from 'bcrypt'

@Injectable()
export class OtpService {
    constructor(
        private readonly redisService: RedisService
    ) { }

    private getTTLForPurpose(purpose: string): number {
        switch (purpose) {
            case 'forgot-password': return 3 * 60 //3 minutes
            default: return 5 * 60
        }
    }

    async generateOTP(generateOTPDto: GenerateOTPDto) {
        const otp = String(randomInt(100000, 999999))
        await this.redisService.set(
            `otp:${generateOTPDto.purpose + generateOTPDto.userId}`, //key
            await bcrypt.hash(otp, Number(process.env.SALT_ROUNDS)), // otp đã được hash
            this.getTTLForPurpose(generateOTPDto.purpose) // Thời gian tồn tại
        )

        return otp
    }

    async validateOTP(validateOTPDto: ValidateOTPDto) : Promise <boolean> {
        const otp = await this.redisService.get(`otp:${validateOTPDto.purpose + validateOTPDto.userId}`)

        if (!otp) return false

        if(await bcrypt.compare(validateOTPDto.otp, otp)){
            await this.redisService.delete(`otp:${validateOTPDto.purpose + validateOTPDto.userId}`)
            return true
        } else {
            return false
        }
    }
}