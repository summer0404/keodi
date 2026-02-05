/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";
import { PaginationConstants } from "../constants/pagination.constants";
import { SortBy, SortOrder } from "../enums/sort.enum";

export class PaginationQueryDto {
    @ApiProperty({ description: 'Page number', example: 1, default: PaginationConstants.DEFAULT_PAGE, required: false })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    page?: number = PaginationConstants.DEFAULT_PAGE;

    @ApiProperty({ description: 'Items per page', example: 10, default: PaginationConstants.DEFAULT_LIMIT, required: false })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit?: number = PaginationConstants.DEFAULT_LIMIT;

    @ApiProperty({ description: 'Sort by field', enum: SortBy, default: SortBy.DISTANCE, required: false })
    @IsOptional()
    @IsEnum(SortBy)
    sortBy?: SortBy = SortBy.DISTANCE;

    @ApiProperty({ description: 'Sort order', enum: SortOrder, default: SortOrder.ASC, required: false })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.ASC;
}

export abstract class PaginationResponseDto {
    @ApiProperty({ description: 'Total number of items' })
    total: number;

    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;

    @ApiProperty({ description: 'Items per page' })
    limit: number;
}
