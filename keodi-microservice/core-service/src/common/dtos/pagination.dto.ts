/* eslint-disable prettier/prettier */
import { IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";
import { FriendSortBy, SortBy, SortOrder } from "../enums/sort.enum";

export class PaginationQueryDto {
    @IsNumber()
    @IsOptional()
    @Min(1)
    page: number;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit: number;

    @IsEnum(SortBy)
    sortBy: SortBy | FriendSortBy = SortBy.DISTANCE;

    @IsEnum(SortOrder)
    sortOrder: SortOrder = SortOrder.ASC;
}