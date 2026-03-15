import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PlaceSortBy, SortOrder } from '../enums/sort.enum';
import { PaginationQueryDto, PaginationResponseDto } from './pagination.dto';
import { PlaceDistanceDto } from './place.dto';

export class GetFavoritesQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Sort by field',
    enum: PlaceSortBy,
    default: PlaceSortBy.CREATED_AT,
    required: false,
  })
  @IsOptional()
  @IsEnum(PlaceSortBy)
  sortBy?: PlaceSortBy = PlaceSortBy.CREATED_AT;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export class FavoriteResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  placeId: string;

  @ApiProperty()
  createdAt: Date;
}

export class FavoritesListResponseDto extends PaginationResponseDto {
  @ApiProperty({
    type: [PlaceDistanceDto],
    description: 'List of favorite places',
  })
  favorites: PlaceDistanceDto[];
}

export class IsFavoriteResponseDto {
  @ApiProperty()
  isFavorite: boolean;
}
