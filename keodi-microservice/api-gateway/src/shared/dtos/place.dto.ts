/* eslint-disable prettier/prettier */
import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PlaceConstants } from '../constants/place.constant';
import { PlaceSortBy } from '../enums/sort.enum';
import { PaginationQueryDto, PaginationResponseDto } from './pagination.dto';

export class CoordinateDto {
  @ApiProperty({ description: 'User latitude', example: 10.76407 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'User longitude', example: 106.67838 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class NearMeQueryDto extends IntersectionType(CoordinateDto, PaginationQueryDto) {
  @ApiProperty({
    description: 'Sort by field',
    enum: PlaceSortBy,
    default: PlaceSortBy.DISTANCE,
    required: false,
  })
  @IsOptional()
  @IsEnum(PlaceSortBy)
  sortBy: PlaceSortBy = PlaceSortBy.DISTANCE;

  @ApiProperty({
    description: 'Search radius in kilometers',
    example: 5,
    default: PlaceConstants.DEFAULT_RADIUS,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(100)
  radius?: number = PlaceConstants.DEFAULT_RADIUS;
}

export class SearchDto extends NearMeQueryDto {
  @ApiProperty({
    description: 'Search keyword',
    example: 'coffee',
    required: true,
  })
  @IsNotEmpty()
  search: string;
}

export class OpeningHourDto {
  @ApiProperty({
    description: 'Day of week (0 = Sunday, 6 = Saturday)',
    example: 1,
  })
  dayOfWeek: number;

  @ApiProperty({ description: 'Opening time', example: '08:00:00' })
  openTime: Date | null;

  @ApiProperty({ description: 'Closing time', example: '22:00:00' })
  closeTime: Date | null;
}

export class PlaceCategoryDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Category name', example: 'Coffee Shop' })
  name: string;

  @ApiProperty({
    description: 'Whether this is the main category',
    example: true,
  })
  isMain: boolean;
}

export class PlaceDistanceDto {
  @ApiProperty({
    description: 'Unique identifier of the place',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description:
      'Indicates if the place data is sourced from Google Places API',
    example: true,
  })
  fromGoogle: boolean;

  @ApiProperty({ description: 'Place name', example: 'Starbucks Coffee' })
  name: string;

  @ApiProperty({
    description: 'Place description',
    example: 'A popular coffeehouse chain',
  })
  description: string | null;

  @ApiProperty({ description: 'Average rating of the place', example: 4.5 })
  rating: number;

  @ApiProperty({
    description: 'Google Maps link for the place',
    example: 'https://maps.google.com/?q=10.76407,106.67838',
  })
  googleMapLink: string;

  @ApiProperty({
    description: 'Website URL of the place',
    example: 'https://www.starbucks.com',
  })
  website: string | null;

  @ApiProperty({
    description: 'Phone number of the place',
    example: '+1 234 567 890',
  })
  phoneNumber: string | null;

  @ApiProperty({
    description: 'Feature image URL of the place',
    example: 'https://www.example.com/image.jpg',
  })
  featureImageUrl: string | null;

  @ApiProperty({
    description: 'Owner ID of the place',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  ownerId: string | null;

  @ApiProperty({ description: 'Latitude of the place', example: 10.76407 })
  latitude: number;

  @ApiProperty({ description: 'Longitude of the place', example: 106.67838 })
  longitude: number;

  @ApiProperty({
    description: 'Full address of the place',
    example:
      '255 Đỗ Xuân Hợp, Phường Tân Phú, Quận 9, TP. Hồ Chí Minh, Việt Nam',
  })
  fullAddress: string | null;

  @ApiProperty({ description: 'Ward of the place', example: 'Phường Tân Phú' })
  ward: string | null;

  @ApiProperty({
    description: 'Street of the place',
    example: '255 Đỗ Xuân Hợp',
  })
  street: string | null;

  @ApiProperty({
    description: 'District of the place',
    example: 'Quận 9, TP. Hồ Chí Minh',
  })
  city: string | null;

  @ApiProperty({ description: 'Country code of the place', example: 'VN' })
  countryCode: string | null;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2024-01-02T00:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Distance from the user location in kilometers',
    example: 2.5,
  })
  distance: number; // in kilometers

  @ApiProperty({
    description: 'Indicates if the place is marked as favorite by the user',
    example: true,
  })
  isFavorite: boolean;

  @ApiProperty({
    type: [OpeningHourDto],
    description: 'Opening hours of the place',
  })
  openingHours: OpeningHourDto[];

  @ApiProperty({
    type: [PlaceCategoryDto],
    description: 'Categories of the place',
  })
  categories: PlaceCategoryDto[];
}

export class NearMePlacesResponseDto extends PaginationResponseDto {
  @ApiProperty({
    type: [PlaceDistanceDto],
    description: 'List of nearby places',
  })
  places: PlaceDistanceDto[];
}

export class PlaceRecommendationResponseDto extends PickType(PlaceDistanceDto, [
  'id',
  'name',
  'description',
  'rating',
  'fullAddress',
  'latitude',
  'longitude',
  'featureImageUrl',
  'googleMapLink',
  'phoneNumber',
  'website',
  'openingHours',
  'categories',
] as const) {}
