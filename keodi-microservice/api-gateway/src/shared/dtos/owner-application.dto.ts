import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

export class ResubmitOwnerApplicationDto {
  @ApiProperty({ example: 'My Coffee Shop', description: 'Updated business name' })
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @ApiProperty({ example: '+84901234567', description: 'Updated business phone' })
  @IsNotEmpty()
  @IsString()
  businessPhone: string;

  @ApiProperty({ example: '123 Main St, HCMC', description: 'Updated business address' })
  @IsNotEmpty()
  @IsString()
  businessAddress: string;

  @ApiProperty({ example: 'TAX-12345', description: 'Updated tax ID' })
  @IsNotEmpty()
  @IsString()
  taxId: string;

  @ApiPropertyOptional({ example: 'https://mycoffee.com', description: 'Business website (optional)' })
  @IsOptional()
  @IsString()
  businessWebsite?: string;

  @ApiProperty({ type: [String], example: ['https://s3.example.com/doc1.pdf'], description: 'Updated proof documents' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  proofDocumentUrls: string[];
}
