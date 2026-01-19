import { OtpPurpose } from "src/common/enums/otp.enum"
import { VerifyUrlPurpose } from "src/common/enums/verifyUrl.enum"

export const getTTLForPurpose = (purpose: string): number => {
    switch (purpose) {
        case OtpPurpose.FORGOT_PASSWORD: return 3 * 60 //3 minutes
        case OtpPurpose.RESET_PASSWORD: return 5 * 60 //5 minutes
        case VerifyUrlPurpose.VERIFY_EMAIL: return 60 * 60
        default: return 60 * 60
    }
}