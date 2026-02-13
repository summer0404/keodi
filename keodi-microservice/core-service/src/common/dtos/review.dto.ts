import { IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";

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