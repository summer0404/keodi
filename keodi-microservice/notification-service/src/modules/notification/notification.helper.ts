import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/providers/redis/redis.service';
import { EmailSubject } from 'src/shared/enums/email.enum';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';

@Injectable()
export class NotificationHelper {
    constructor(private readonly redisService: RedisService) { }

    async isOnline(
        userId: string,
    ): Promise<boolean> {
        const val = await this.redisService.get(`presence:${userId}`);
        return val === 'online';
    }


    getEmailSubject = (purpose: string): string => {
    switch (purpose) {
        case OtpPurpose.FORGOT_PASSWORD:
            return EmailSubject.FORGOT_PASSWORD;
        case OtpPurpose.RESET_PASSWORD:
            return EmailSubject.RESET_PASSWORD;
        case VerifyUrlPurpose.VERIFY_EMAIL:
            return EmailSubject.VERIFY_EMAIL;
        default:
            return 'Keodi - OTP Code';
    }
}
}