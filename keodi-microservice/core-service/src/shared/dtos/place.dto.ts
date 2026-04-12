import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';
import { PlaceSortBy } from '../enums/sort.enum';
import { IntersectionType } from '@nestjs/mapped-types';

export class CoordinateDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

export class NearMeDto extends IntersectionType(CoordinateDto, PaginationQueryDto) {
  @IsNotEmpty()
  @IsNumber()
  radius: number;

  @IsNotEmpty()
  userId: string;

  @IsEnum(PlaceSortBy)
  sortBy: PlaceSortBy = PlaceSortBy.DISTANCE;
}

export class SearchDto extends NearMeDto {
  @IsNotEmpty()
  search: string;
}
