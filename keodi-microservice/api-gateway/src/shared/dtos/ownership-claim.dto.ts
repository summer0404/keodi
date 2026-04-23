import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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