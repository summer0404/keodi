/* eslint-disable prettier/prettier */
import { ApiProperty, IntersectionType, OmitType, PickType } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PlaceConstants } from '../constants/place.constant';
import { PlaceSortBy } from '../enums/sort.enum';
import { PlaceStatus } from '../enums/place.enum';
import { PaginationQueryDto, PaginationResponseDto } from './pagination.dto';
import { parseArray, parseStringArray } from '../utils/type.util';


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

export class CreatePlaceOpeningHourDto {
  @ApiProperty({
    description: 'Day of week (0 = Sunday, 6 = Saturday)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Opening time in HH:mm or HH:mm:ss',
    example: '08:00',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  openTime?: string | null;

  @ApiProperty({
    description: 'Closing time in HH:mm or HH:mm:ss',
    example: '22:00',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  closeTime?: string | null;
}

export class CreatePlaceDto {
  @ApiProperty({ description: 'Place name', example: 'Sunset Coffee' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Place description',
    example: 'Cozy cafe with parking and pet-friendly space',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Street address',
    example: '255 Do Xuan Hop',
  })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({
    description: 'Ward',
    example: 'Tan Phu Ward',
  })
  @IsNotEmpty()
  @IsString()
  ward: string;

  @ApiProperty({
    description: 'City',
    example: 'Thu Duc City',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Country code',
    example: 'VN',
  })
  @IsNotEmpty()
  @IsString()
  countryCode: string;

  @ApiProperty({ description: 'Place latitude', example: 10.76407 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Place longitude', example: 106.67838 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Main category ID',
    example: 'clx123-main-category',
  })
  @IsNotEmpty()
  @IsString()
  mainCategoryId: string;

  @ApiProperty({
    description: 'Secondary category IDs',
    required: false,
    type: [String],
    example: ['clx123-secondary-category'],
  })
  @Transform(({ value }) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryCategoryIds?: string[];

  @ApiProperty({
    description: 'Phone number',
    example: '+84901234567',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Website',
    example: 'https://sunsetcoffee.vn',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    description: 'Google Maps link, if not exist will be auto generated based on latitude and longitude',
    example: 'https://maps.app.goo.gl/example',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  googleMapLink?: string;

  @ApiProperty({
    description: 'Opening hours by day',
    type: [CreatePlaceOpeningHourDto],
    required: false,
  })
  @Transform(({ value }) => {
    const arr = parseArray(value);
    return arr ? plainToInstance(CreatePlaceOpeningHourDto, arr) : arr;
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlaceOpeningHourDto)
  openingHours?: CreatePlaceOpeningHourDto[];

  @ApiProperty({
    description: 'Attribute IDs',
    required: false,
    type: [String],
    example: ['clx123-attribute-parking', 'clx123-attribute-pet-friendly'],
  })
  @Transform(({ value }) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attributeIds?: string[];
}

export class CreatePlaceResponseDto {
  @ApiProperty({ example: 'Place created successfully and sent for review' })
  message: string;

  @ApiProperty({ example: 'clx123-new-place-id' })
  placeId: string;

  @ApiProperty({ example: 'UNDER_REVIEW' })
  status: string;
}

export class OpeningHourDto {
  @ApiProperty({
    description: 'Day of week (0 = Sunday, 6 = Saturday)',
    example: 1,
  })
  dayOfWeek: number;

  @ApiProperty({ description: 'Opening time', example: '08:00:00' })
  openTime: string | null;

  @ApiProperty({ description: 'Closing time', example: '22:00:00' })
  closeTime: string | null;
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

export class UpdatePlaceDto {
  @ApiProperty({ description: 'Place name', example: 'Sunset Coffee', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Place description',
    example: 'Cozy cafe with parking and pet-friendly space',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Street address', example: '255 Do Xuan Hop', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ description: 'Ward', example: 'Tan Phu Ward', required: false })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiProperty({ description: 'City', example: 'Thu Duc City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Country code', example: 'VN', required: false })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ description: 'Place latitude', example: 10.76407, required: false })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ description: 'Place longitude', example: 106.67838, required: false })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'Google Maps link',
    example: 'https://maps.app.goo.gl/example',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  googleMapLink?: string;

  @ApiProperty({ description: 'Phone number', example: '+84901234567', required: false, nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ description: 'Website', example: 'https://sunsetcoffee.vn', required: false, nullable: true })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ description: 'Main category ID', example: 'clx123-main-category', required: false })
  @IsOptional()
  @IsString()
  mainCategoryId?: string;

  @ApiProperty({
    description: 'Secondary category IDs',
    required: false,
    type: [String],
    example: ['clx123-secondary-category'],
  })
  @Transform(({ value }) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryCategoryIds?: string[];

  @ApiProperty({
    description: 'Opening hours by day',
    type: [CreatePlaceOpeningHourDto],
    required: false,
  })
  @Transform(({ value }) => {
    const arr = parseArray(value);
    return arr ? plainToInstance(CreatePlaceOpeningHourDto, arr) : arr;
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlaceOpeningHourDto)
  openingHours?: CreatePlaceOpeningHourDto[];

  @ApiProperty({
    description: 'Attribute IDs',
    required: false,
    type: [String],
    example: ['clx123-attribute-parking'],
  })
  @Transform(({ value }) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attributeIds?: string[];
}

export class UpdatePlaceResponseDto {
  @ApiProperty({ example: 'Place updated successfully' })
  message: string;
}

export class GetAdminPlacesDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by place status',
    enum: PlaceStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PlaceStatus)
  status?: PlaceStatus;
}

export class RejectPlaceBodyDto {
  @ApiProperty({ description: 'Rejection reason', example: 'Incomplete information' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class ChatSearchDto extends CoordinateDto {
  @ApiProperty({ description: 'User message (can be emotional or abstract)', example: 'Tôi đang buồn, muốn đi đâu đó giải khuây' })
  @IsNotEmpty()
  @IsString()
  message: string;
}

export class AgentSearchResponseDto {
  @ApiProperty({ description: 'AI agent message in Vietnamese' })
  message: string;

  @ApiProperty({ type: [PlaceDistanceDto], description: 'Recommended places with full details including distance' })
  places: PlaceDistanceDto[];
}
