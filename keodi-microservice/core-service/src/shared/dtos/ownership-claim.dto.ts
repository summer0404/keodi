import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOwnershipClaimDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  placeId: string;

  @IsNotEmpty()
  @IsString()
  relationship: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  proofDocumentUrls: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectOwnershipClaimDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}