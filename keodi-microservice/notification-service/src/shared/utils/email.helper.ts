import { EmailSubject } from "../enums/email.enum";
import { OtpPurpose } from "../enums/otp.enum";
import { VerifyUrlPurpose } from "../enums/verifyUrl.enum";

export const getEmailSubject = (purpose: string): string => {
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