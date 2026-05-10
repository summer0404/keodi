/* eslint-disable prettier/prettier */
import { IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";
import { PaginationConstants } from "../constants/pagination.constants";
import { SortOrder } from "../enums/sort.enum";

export class PaginationQueryDto {
    @IsNumber()
    @IsOptional()
    @Min(1)
    page: number = PaginationConstants.DEFAULT_PAGE;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit: number = PaginationConstants.DEFAULT_LIMIT;

    @IsEnum(SortOrder)
    sortOrder: SortOrder = SortOrder.ASC;
}