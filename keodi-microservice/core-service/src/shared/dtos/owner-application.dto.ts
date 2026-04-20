import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

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
