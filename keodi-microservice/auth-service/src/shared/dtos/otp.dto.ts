export class GenerateOTPDto {
    userId: string
    purpose: string
}

export class ValidateOTPDto extends GenerateOTPDto {
    otp: string
}