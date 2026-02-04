/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";
import { PlaceConstants } from "../constants/place.constant";
import { PaginationQueryDto, PaginationResponseDto } from "./pagination.dto";

export class NearMeQueryDto extends PaginationQueryDto {
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

    @ApiProperty({description: 'Search radius in kilometers', example: 5, default: PlaceConstants.DEFAULT_RADIUS, required: false})
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0.1)
    @Max(100)
    radius?: number = PlaceConstants.DEFAULT_RADIUS;
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
}

export class NearMePlacesResponseDto extends PaginationResponseDto {
    @ApiProperty({ type: [PlaceDistanceDto], description: 'List of nearby places' })
    places: PlaceDistanceDto[];
}