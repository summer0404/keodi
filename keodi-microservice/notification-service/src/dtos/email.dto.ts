export class SendForgetPasswordOTPMailDto {
    to: string
    code: string
    subject?: string = 'Your OTP Code for Password Reset'
}