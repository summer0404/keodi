export class GenerateOTPDto {
    userId: number
    purpose: string
}

export class ValidateOTPDto extends GenerateOTPDto {
    otp: string
}