import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from "class-validator";
import { PaginationQueryDto } from "./pagination.dto";
import { SearchMode } from "../enums/search.enum";
import { PlaceSortBy } from "../enums/sort.enum";


export class NearMeDto extends PaginationQueryDto {
    @IsNotEmpty()
    @IsNumber()
    latitude: number;

    @IsNotEmpty()
    @IsNumber()
    longitude: number;

    @IsNotEmpty()
    @IsNumber()
    radius: number;

    @IsNotEmpty()
    userId: string;

    @IsEnum(PlaceSortBy)
    sortBy: PlaceSortBy = PlaceSortBy.DISTANCE;
}

export class SearchDto extends NearMeDto {
    @IsNotEmpty()
    search: string;

    @IsOptional()
    @IsEnum(SearchMode)
    mode?: SearchMode.KEYWORD = SearchMode.KEYWORD;
}