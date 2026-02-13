import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

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