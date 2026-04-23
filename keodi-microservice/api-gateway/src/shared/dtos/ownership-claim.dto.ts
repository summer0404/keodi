import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto, PaginationResponseDto } from './pagination.dto';
import { OwnershipClaimStatus } from '../enums/ownership-claim.enum';

export class CreateOwnershipClaimDto {
  @ApiProperty({ example: 'place_id_here' })
  @IsNotEmpty()
  @IsString()
  placeId: string;

  @ApiProperty({ example: 'manager' })
  @IsNotEmpty()
  @IsString()
  relationship: string;

  @ApiProperty({ example: ['url1', 'url2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  proofDocumentUrls: string[];

  @ApiPropertyOptional({ example: 'Additional context' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectOwnershipClaimDto {
  @ApiProperty({ example: 'Proof is insufficient' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class OwnershipClaimActionResponseDto {
  @ApiProperty({ example: 'Ownership claim processed successfully' })
  message: string;
}

export class OwnershipClaimResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  placeId: string;

  @ApiProperty()
  relationship: string;

  @ApiProperty({ type: [String] })
  proofDocumentUrls: string[];

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty({ enum: OwnershipClaimStatus })
  status: OwnershipClaimStatus;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };

  @ApiPropertyOptional()
  place?: {
    id: string;
    name: string;
  };
}

export class PaginatedOwnershipClaimResponseDto extends PaginationResponseDto {
  @ApiProperty({ type: [OwnershipClaimResponseDto] })
  data: OwnershipClaimResponseDto[];
}

export class GetOwnershipClaimsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OwnershipClaimStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(OwnershipClaimStatus)
  status?: OwnershipClaimStatus;
}