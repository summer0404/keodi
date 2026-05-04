import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';
import { OwnerApplicationStatus } from '@prisma/client';

export class CreateOwnerApplicationDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  businessName: string;

  @IsNotEmpty()
  @IsString()
  businessPhone: string;

  @IsNotEmpty()
  @IsString()
  businessAddress: string;

  @IsNotEmpty()
  @IsString()
  taxId: string;

  @IsOptional()
  @IsString()
  businessWebsite?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  proofDocumentUrls: string[];
}

export class RejectOwnerApplicationDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class GetOwnerApplicationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OwnerApplicationStatus)
  status?: OwnerApplicationStatus;
}

export class ResubmitOwnerApplicationDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  businessName: string;

  @IsNotEmpty()
  @IsString()
  businessPhone: string;

  @IsNotEmpty()
  @IsString()
  businessAddress: string;

  @IsNotEmpty()
  @IsString()
  taxId: string;

  @IsOptional()
  @IsString()
  businessWebsite?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  proofDocumentUrls: string[];
}
