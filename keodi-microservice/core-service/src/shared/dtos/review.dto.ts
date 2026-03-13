import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";
import { PaginationQueryDto } from "./pagination.dto";
import { SortBy } from "../enums/sort.enum";

export class CreateReviewDto {
    @IsNotEmpty()
    userId: string;

    @IsNotEmpty()
    placeId: string;

    @IsNotEmpty()
    @IsNumber()
    @Max(5)
    @Min(1)
    rating: number;

    @IsOptional()
    text?: string;
}

export class GetReviewsDto extends PaginationQueryDto {
    @IsNotEmpty()
    placeId: string;

    @IsEnum(SortBy)
    sortBy: SortBy = SortBy.CREATED_AT;
}