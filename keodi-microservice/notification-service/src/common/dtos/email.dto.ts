import { OmitType } from "@nestjs/mapped-types"

export class SendOTPMailDto {
    to: string
    code: string
    subject?: string 
}

export class SendVerifyURLDto extends OmitType(SendOTPMailDto, ['code']) {
    url: string
}