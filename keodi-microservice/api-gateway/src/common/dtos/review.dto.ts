import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator/types/decorator/typechecker/IsString";
import { IsNotEmpty } from "class-validator/types/decorator/common/IsNotEmpty";
import { Type } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

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