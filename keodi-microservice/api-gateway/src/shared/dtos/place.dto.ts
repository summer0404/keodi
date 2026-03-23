/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";
import { PlaceConstants } from "../constants/place.constant";
import { PaginationQueryDto, PaginationResponseDto } from "./pagination.dto";
import { SearchMode } from "../enums/search.enum";
import { PlaceSortBy } from "../enums/sort.enum";

export class NearMeQueryDto extends PaginationQueryDto {
    @ApiProperty({ description: 'Sort by field', enum: PlaceSortBy, default: PlaceSortBy.DISTANCE, required: false })
    @IsOptional()
    @IsEnum(PlaceSortBy)
    sortBy: PlaceSortBy = PlaceSortBy.DISTANCE;

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

    @ApiProperty({ description: 'Search radius in kilometers', example: 5, default: PlaceConstants.DEFAULT_RADIUS, required: false })
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
        required: true
    })
    @IsNotEmpty()
    search: string;

    @ApiProperty({
        description: 'Search mode',
        enum: SearchMode,
        example: SearchMode.KEYWORD,
        required: false,
        default: SearchMode.KEYWORD
    })
    @IsOptional()
    @IsEnum(SearchMode)
    mode?: SearchMode = SearchMode.KEYWORD;
}

export class OpeningHourDto {
    @ApiProperty({ description: 'Day of week (0 = Sunday, 6 = Saturday)', example: 1 })
    dayOfWeek: number;

    @ApiProperty({ description: 'Opening time', example: '08:00:00' })
    openTime: Date;

    @ApiProperty({ description: 'Closing time', example: '22:00:00' })
    closeTime: Date;
}

export class PlaceCategoryDto {
    @ApiProperty({ description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @ApiProperty({ description: 'Category name', example: 'Coffee Shop' })
    name: string;

    @ApiProperty({ description: 'Whether this is the main category', example: true })
    isMain: boolean;
}

export class PlaceDistanceDto {
    id: string;
    fromGoogle: boolean;
    name: string;
    description: string | null;
    rating: number;
    googleMapLink: string;
    website: string | null;
    phoneNumber: string | null;
    featureImageUrl: string | null;
    ownerId: string | null;
    latitude: number;
    longitude: number;
    fullAddress: string | null;
    ward: string | null;
    street: string | null;
    city: string | null;
    countryCode: string | null;
    createdAt: Date;
    updatedAt: Date;
    distance: number; // in kilometers
    isFavorite: boolean;

    @ApiProperty({ type: [OpeningHourDto], description: 'Opening hours of the place' })
    openingHours: OpeningHourDto[];

    @ApiProperty({ type: [PlaceCategoryDto], description: 'Categories of the place' })
    categories: PlaceCategoryDto[];
}

export class NearMePlacesResponseDto extends PaginationResponseDto {
    @ApiProperty({ type: [PlaceDistanceDto], description: 'List of nearby places' })
    places: PlaceDistanceDto[];
}