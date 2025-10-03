import { EmailSubject } from "src/enums/email.enum";
import { OtpPurpose } from "src/enums/otp.enum";

export const getEmailSubject = (purpose: string): string => {
    switch (purpose) {
        case OtpPurpose.FORGOT_PASSWORD:
            return EmailSubject.FORGOT_PASSWORD;
        case OtpPurpose.RESET_PASSWORD:
            return EmailSubject.RESET_PASSWORD;
        default:
            return 'Keodi - OTP Code';
    }
}