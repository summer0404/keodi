import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PaginationConstants } from 'src/shared/constants/pagination.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  FavoriteResponseDto,
  FavoritesListResponseDto,
  GetFavoritesQueryDto,
  IsFavoriteResponseDto,
} from 'src/shared/dtos/favorite.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { FavoriteService } from './favorite.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':placeId')
  @ApiOperation({ summary: 'Add a place to favorites' })
  @ApiOkResponse({ type: FavoriteResponseDto })
  async addFavorite(
    @CurrentUser() user: CurrentUserDto,
    @Param('placeId') placeId: string,
  ) {
    return await this.favoriteService.addFavorite(user.id, placeId);
  }

  @Delete(':placeId')
  @ApiOperation({ summary: 'Remove a place from favorites' })
  @ApiOkResponse({ type: FavoriteResponseDto })
  async removeFavorite(
    @CurrentUser() user: CurrentUserDto,
    @Param('placeId') placeId: string,
  ) {
    return await this.favoriteService.removeFavorite(user.id, placeId);
  }

  @Get('check/:placeId')
  @ApiOperation({ summary: 'Check if a place is in favorites' })
  @ApiOkResponse({ type: IsFavoriteResponseDto })
  async isFavorite(
    @CurrentUser() user: CurrentUserDto,
    @Param('placeId') placeId: string,
  ) {
    return await this.favoriteService.isFavorite(user.id, placeId);
  }

  @Get()
  @ApiOperation({ summary: "Get user's favorite places" })
  @ApiOkResponse({ type: FavoritesListResponseDto })
  async getUserFavorites(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetFavoritesQueryDto,
  ) {
    return await this.favoriteService.getUserFavorites(
      user.id,
      query.page || PaginationConstants.DEFAULT_PAGE,
      query.limit || PaginationConstants.DEFAULT_LIMIT,
      query.sortBy,
      query.sortOrder,
    );
  }
}
