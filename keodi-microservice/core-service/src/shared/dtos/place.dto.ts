import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
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

export class NearMeDto extends IntersectionType(
  CoordinateDto,
  PaginationQueryDto,
) {
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

export class CreatePlaceOpeningHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsOptional()
  @IsString()
  openTime?: string | null;

  @IsOptional()
  @IsString()
  closeTime?: string | null;
}

export class CreatePlaceDto {
  @IsNotEmpty()
  @IsString()
  ownerId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNotEmpty()
  @IsString()
  mainCategoryId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryCategoryIds?: string[];

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  openingHours?: CreatePlaceOpeningHourDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attributeIds?: string[];

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  featureImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryImageUrls?: string[];
}
