export class SendOTPMailDto {
    to: string
    code: string
    subject?: string 
}