import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsNumber, IsOptional, Max, Min, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { SortBy } from "../enums/sort.enum";
import { PaginationQueryDto, PaginationResponseDto } from "./pagination.dto";

export class CreateReviewDto {
    @ApiProperty({
        description: 'ID of the place being reviewed',
        example: 'plc1234567890abcdef',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    placeId: string;

    @ApiProperty({
        description: 'Rating given to the place',
        example: 4,
        minimum: 1,
        maximum: 5,
        required: true,
    })
    @IsNotEmpty()
    @IsNumber()
    @Max(5)
    @Min(1)
    @Type(() => Number)
    rating: number;

    @ApiProperty({
        description: 'Textual review of the place',
        example: 'Great place with excellent service!',
        required: false,
    })
    @IsString()
    @IsOptional()
    text?: string;
}

export class GetReviewsDto extends PaginationQueryDto {
    @ApiProperty({
        description: 'Field to sort reviews by',
        enum: SortBy,
        example: SortBy.CREATED_AT,
        required: false,
        default: SortBy.CREATED_AT
    })
    @IsOptional()
    @IsEnum(SortBy)
    sortBy: SortBy = SortBy.CREATED_AT;
}

export class ReviewDto {
    id: string
    placeId: string
    userId: string
    fromGoogle: boolean
    reviewerName: string
    reviewerPicture: string | null
    rating: number
    text: string | null
    originalLanguage: string | null
    sentimentAnalyzed: boolean

    createdAt: Date;
    updatedAt: Date;

    images: string[]
}

export class ReviewResponseDto extends PaginationResponseDto {
    @ApiProperty({ type: [ReviewDto], description: 'List of reviews' })
    reviews: ReviewDto[]
}
