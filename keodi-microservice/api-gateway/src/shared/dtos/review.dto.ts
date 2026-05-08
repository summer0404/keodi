import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsNumber, IsOptional, Max, Min, IsEnum, IsBoolean, IsDateString } from "class-validator";
import { Type } from "class-transformer";
import { SortBy } from "../enums/sort.enum";
import { PaginationQueryDto, PaginationResponseDto } from "./pagination.dto";
import { ReviewFlagReason, ReviewFlagStatus } from "../enums/review.enum";

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

export class GetOwnerReviewsQueryDto extends PaginationQueryDto {
    @ApiProperty({ description: 'Filter by rating (1-5)', minimum: 1, maximum: 5, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(5)
    rating?: number;

    @ApiProperty({ description: 'Start of date range (ISO 8601)', example: '2024-01-01', required: false })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiProperty({ description: 'End of date range (ISO 8601)', example: '2024-12-31', required: false })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiProperty({ description: 'Filter by response status. true = responded, false = not responded', required: false })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    responded?: boolean;
}

export class RespondToReviewBodyDto {
    @ApiProperty({ description: 'Owner response text', example: 'Thank you for your feedback!' })
    @IsNotEmpty()
    @IsString()
    text: string;
}

export class UpdateReviewResponseBodyDto {
    @ApiProperty({ description: 'Updated response text', example: 'Thank you for the updated feedback!' })
    @IsNotEmpty()
    @IsString()
    text: string;
}

export class FlagReviewBodyDto {
    @ApiProperty({ description: 'Reason for flagging the review', enum: ReviewFlagReason })
    @IsEnum(ReviewFlagReason)
    reason: ReviewFlagReason;
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
    ownerResponse: string | null
    ownerRespondedAt: Date | null
    ownerResponseEditedAt: Date | null

    createdAt: Date;
    updatedAt: Date;

    images: string[]
}

export class ReviewResponseDto extends PaginationResponseDto {
    @ApiProperty({ type: [ReviewDto], description: 'List of reviews' })
    reviews: ReviewDto[]
}

export class GetAdminReviewsQueryDto extends PaginationQueryDto {
    @ApiProperty({ description: 'Filter by place ID', required: false })
    @IsOptional()
    @IsString()
    placeId?: string;

    @ApiProperty({ description: 'Filter by flag status', enum: ReviewFlagStatus, required: false })
    @IsOptional()
    @IsEnum(ReviewFlagStatus)
    flagStatus?: ReviewFlagStatus;

    @ApiProperty({ description: 'Filter by rating (1-5)', minimum: 1, maximum: 5, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(5)
    rating?: number;

    @ApiProperty({ description: 'Start of date range (ISO 8601)', example: '2024-01-01', required: false })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiProperty({ description: 'End of date range (ISO 8601)', example: '2024-12-31', required: false })
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}
