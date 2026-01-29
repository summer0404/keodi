/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";
import { SortBy, SortOrder } from "../enums/sort.enum";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

export class PaginationQueryDto {
    @ApiProperty({description: 'Page number', example: 1, default: DEFAULT_PAGE, required: false})
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    page?: number = DEFAULT_PAGE;

    @ApiProperty({description: 'Items per page', example: 10, default: DEFAULT_LIMIT, required: false})
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit?: number = DEFAULT_LIMIT;

    @ApiProperty({description: 'Sort by field', enum: SortBy, default: SortBy.DISTANCE, required: false})
    @IsOptional()
    @IsEnum(SortBy)
    sortBy?: SortBy = SortBy.DISTANCE;

    @ApiProperty({description: 'Sort order', enum: SortOrder, default: SortOrder.ASC, required: false })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.ASC;
}
