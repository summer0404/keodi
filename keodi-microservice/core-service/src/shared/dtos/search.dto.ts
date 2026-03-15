import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class CreateSearchDto {
    @IsNotEmpty()
    extractedTerm: string;

    @IsOptional()
    userId?: string;
}


export class SearchTrendingScoreDto {
    @IsNotEmpty()
    extractedTerm: string;
    
    @IsNotEmpty()
    @IsNumber()
    score: number;
}