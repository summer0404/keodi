export class SendMailDto {
    to: string
}

export class SendOTPDto extends SendMailDto{
    code: string
}

export class SendVerifyURLDto extends SendMailDto{
    url: string
}

export class OwnerApplicationReceivedDto extends SendMailDto {
    businessDays: number
}

export class OwnerApplicationApprovedDto extends SendMailDto {}

export class OwnerApplicationRejectedDto extends SendMailDto {
    reason: string
}

export class OwnershipClaimApprovedDto extends SendMailDto {}

export class OwnershipClaimRejectedDto extends SendMailDto {
    reason: string
}

export class OwnershipRevokedDto extends SendMailDto {
    placeName: string
}

export class OwnershipClaimDisputedDto extends SendMailDto {
    placeName: string
}

export type EmailPayloadDto =
    SendOTPDto |
    SendVerifyURLDto |
    OwnerApplicationReceivedDto |
    OwnerApplicationApprovedDto |
    OwnerApplicationRejectedDto |
    OwnershipClaimApprovedDto |
    OwnershipClaimRejectedDto |
    OwnershipRevokedDto |
    OwnershipClaimDisputedDto;
