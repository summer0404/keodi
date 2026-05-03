import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto, PaginationResponseDto } from './pagination.dto';

export enum OwnerApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class RejectOwnerApplicationDto {
  @ApiProperty({
    example:
      'Your submitted business license is expired. Please resubmit a valid document.',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class OwnerApplicationActionResponseDto {
  @ApiProperty({ example: 'Owner application approved successfully' })
  message: string;
}

export class GetOwnerApplicationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OwnerApplicationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(OwnerApplicationStatus)
  status?: OwnerApplicationStatus;
}

export class OwnerApplicationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  businessPhone: string;

  @ApiProperty()
  businessAddress: string;

  @ApiProperty()
  taxId: string;

  @ApiPropertyOptional()
  businessWebsite?: string;

  @ApiProperty({ type: [String] })
  proofDocumentUrls: string[];

  @ApiProperty({ enum: OwnerApplicationStatus })
  status: OwnerApplicationStatus;

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
    firstName?: string;
    lastName?: string;
    username: string;
    email: string;
    role: string;
  };
}

export class PaginatedOwnerApplicationResponseDto extends PaginationResponseDto {
  @ApiProperty({ type: [OwnerApplicationResponseDto] })
  data: OwnerApplicationResponseDto[];
}
