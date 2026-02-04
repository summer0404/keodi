import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination.dto';

export class GetFavoritesQueryDto extends PaginationQueryDto {}

export class FavoriteResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  placeId: string;

  @ApiProperty()
  createdAt: Date;
}

export class FavoritesListResponseDto {
  @ApiProperty({ type: [Object] })
  favorites: any[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  limit: number;
}

export class IsFavoriteResponseDto {
  @ApiProperty()
  isFavorite: boolean;
}
