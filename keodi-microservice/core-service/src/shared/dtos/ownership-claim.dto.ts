import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OwnershipClaimStatus } from '@prisma/client';
import { PaginationQueryDto } from './pagination.dto';

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

export class GetOwnershipClaimsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OwnershipClaimStatus)
  status?: OwnershipClaimStatus;
}