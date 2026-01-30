import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray } from "class-validator";

export class CategoryDto {
    @ApiProperty({ description: 'Category ID' })
    id: string;

    @ApiProperty({ description: 'Category name' })
    name: string;

    @ApiProperty({ description: 'Indicates if the category is selectable' })
    isSelectable: boolean;
}

export class CategoryOnboardingDto {
    @ApiProperty({ description: 'list category to onboard'})
    @IsArray()
    categoryIds: string[]
}