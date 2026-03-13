import { IsNotEmpty, IsOptional } from "class-validator";

export class CreateSearchDto {
    @IsNotEmpty()
    extractedTerm: string;

    @IsOptional()
    userId?: string;
}