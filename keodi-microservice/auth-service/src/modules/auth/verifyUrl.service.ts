import { Inject, Injectable } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import * as bcrypt from "bcrypt"
import { VerifyUrlPurpose } from "src/shared/enums/verifyUrl.enum";
import { VerifyUrlDto } from "src/shared/dtos/verifyUrl.dto";
import { getTTLForPurpose } from "src/shared/utils/ttl-redis.helper";
import { RedisService } from "src/providers/redis/redis.service";

@Injectable()
export class VerifyUrlService{
    constructor (
        private readonly redisService: RedisService,
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    ){}

    async sendVerifyUrlWithPurpose (email: string, token: string, purpose: string) {
        await this.redisService.set(
            `verifyUrl:${purpose}:${email}`,
            await bcrypt.hash(token, Number(process.env.SALT_ROUNDS)),
            getTTLForPurpose(purpose)
        )

        switch(purpose) {
            case VerifyUrlPurpose.VERIFY_EMAIL:
                this.kafkaClient.emit('notification.verify-email', {to: email, url: process.env.VERIFY_EMAIL_API + token})
                break
            default:
                break
        }
    }

    async validateVerifyUrl (verifyUrlDto: VerifyUrlDto) : Promise<boolean> {
        const token = await this.redisService.get(`verifyUrl:${verifyUrlDto.purpose}:${verifyUrlDto.email}`)

        if(!token) return false

        if(!(await bcrypt.compare(verifyUrlDto.token, token))) return false

        await this.redisService.delete(`verifyUrl:${verifyUrlDto.purpose}:${verifyUrlDto.email}`)
        
        return true
    }

    async getTTLToken (email: string, purpose: string) : Promise<number> {
        return await this.redisService.ttl(`verifyUrl:${purpose}:${email}`)
    }
}