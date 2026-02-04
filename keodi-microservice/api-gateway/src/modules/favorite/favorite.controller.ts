import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PaginationConstants } from 'src/common/constants/pagination.constants';
import {
  FavoriteResponseDto,
  FavoritesListResponseDto,
  GetFavoritesQueryDto,
  IsFavoriteResponseDto,
} from 'src/common/dtos/favorite.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FavoriteService } from './favorite.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':placeId')
  @ApiOperation({ summary: 'Add a place to favorites' })
  @ApiOkResponse({ type: FavoriteResponseDto })
  async addFavorite(@Req() req, @Param('placeId') placeId: string) {
    const userId = req.user.id;
    return await this.favoriteService.addFavorite(userId, placeId);
  }

  @Delete(':placeId')
  @ApiOperation({ summary: 'Remove a place from favorites' })
  @ApiOkResponse({ type: FavoriteResponseDto })
  async removeFavorite(@Req() req, @Param('placeId') placeId: string) {
    const userId = req.user.id;
    return await this.favoriteService.removeFavorite(userId, placeId);
  }

  @Get('check/:placeId')
  @ApiOperation({ summary: 'Check if a place is in favorites' })
  @ApiOkResponse({ type: IsFavoriteResponseDto })
  async isFavorite(@Req() req, @Param('placeId') placeId: string) {
    const userId = req.user.id;
    return await this.favoriteService.isFavorite(userId, placeId);
  }

  @Get()
  @ApiOperation({ summary: "Get user's favorite places" })
  @ApiOkResponse({ type: FavoritesListResponseDto })
  async getUserFavorites(@Req() req, @Query() query: GetFavoritesQueryDto) {
    const userId = req.user.id;
    return await this.favoriteService.getUserFavorites(
      userId,
      query.page || PaginationConstants.DEFAULT_PAGE,
      query.limit || PaginationConstants.DEFAULT_LIMIT,
      query.sortBy,
      query.sortOrder,
    );
  }
}
