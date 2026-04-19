import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class CategoryDto {
  @ApiProperty({ description: 'Category ID' })
  id!: string;

  @ApiProperty({ description: 'Category name' })
  name!: string;

  @ApiProperty({ description: 'Indicates if the category is selectable' })
  isSelectable!: boolean;
}

export class CategorySearchResultDto {
  @ApiProperty({ description: 'Category ID' })
  id!: string;

  @ApiProperty({ description: 'Category name' })
  name!: string;

  @ApiProperty({
    description: 'Number of places associated with this category',
    example: 42,
  })
  placeCount!: number;

  @ApiPropertyOptional({
    description: 'Fuzzy match score (0 = perfect match)',
    example: 0.2,
  })
  score?: number;
}

export class CategoryOnboardingDto {
  @ApiProperty({ description: 'list category to onboard' })
  @IsArray()
  categoryIds!: string[];
}
