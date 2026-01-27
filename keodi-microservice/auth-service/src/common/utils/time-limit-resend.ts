import { OtpPurpose } from "src/common/enums/otp.enum";
import { VerifyUrlPurpose } from "src/common/enums/verifyUrl.enum";

export const timeLimitResend = (purpose: string) : number => {
    switch(purpose){
        case OtpPurpose.FORGOT_PASSWORD:
            return 2 * 60
        case OtpPurpose.RESET_PASSWORD:
            return 3 * 60
        case VerifyUrlPurpose.VERIFY_EMAIL:
            return 5 * 60
        default:
            return 0
    }
}