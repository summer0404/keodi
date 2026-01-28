/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";
import { SortBy, SortOrder } from "../enums/sort.enum";

export class NearMeQueryDto {
    @ApiProperty({description: 'User latitude', example: 10.76407 })
    @Type (() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty({description: 'User longitude', example: 106.67838})
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

    @ApiProperty({description: 'Search radius in kilometers', example: 5, default: 5, required: false})
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0.1)
    @Max(100)
    radius?: number = 5;

    @ApiProperty({description: 'Page number', example: 1, default: 1, required: false})
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    page?: number = 1;

    @ApiProperty({description: 'Items per page', example: 10, default: 10, required: false})
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiProperty({description: 'Sort by field', enum: SortBy, default: SortBy.DISTANCE, required: false})
    @IsOptional()
    @IsEnum(SortBy)
    sortBy?: SortBy = SortBy.DISTANCE;

    @ApiProperty({description: 'Sort order', enum: SortOrder, default: SortOrder.ASC, required: false })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.ASC;
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
}

export class NearMePlacesResponseDto {
    @ApiProperty({ type: [PlaceDistanceDto] })
    places: PlaceDistanceDto[];

    @ApiProperty({description: 'Total number of places found'})
    total: number;

    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({description: 'Total number of pages' })
    totalPages: number;

    @ApiProperty({description: 'Items per page'})
    limit: number;
}