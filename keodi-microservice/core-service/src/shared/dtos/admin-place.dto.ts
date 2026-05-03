import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';
import { PlaceStatus } from '@prisma/client';

export class GetAdminPlacesDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PlaceStatus)
  status?: PlaceStatus;
}

export class RejectPlaceDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}
