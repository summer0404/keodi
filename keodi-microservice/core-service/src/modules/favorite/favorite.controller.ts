import { Controller } from "@nestjs/common";
import { FavoriteService } from "./favorite.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { SortBy, SortOrder } from "src/common/enums/sort.enum";
import { UserCommonPaginationDto } from "src/common/dtos/user.dto";

@Controller()
export class FavoriteController {
    constructor(private readonly favoriteService: FavoriteService) { }

    @MessagePattern('favorite.add')
    async addFavorite(@Payload() data: { userId: string; placeId: string }) {
        return await this.favoriteService.addFavorite(data.userId, data.placeId);
    }

    @MessagePattern('favorite.remove')
    async removeFavorite(@Payload() data: { userId: string; placeId: string }) {
        return await this.favoriteService.removeFavorite(data.userId, data.placeId);
    }

    @MessagePattern('favorite.get-list')
    async getUserFavorites(@Payload() data: UserCommonPaginationDto) {
        return await this.favoriteService.getUserFavorites(data);
    }

    @MessagePattern('favorite.check')
    async isFavorite(@Payload() data: { userId: string; placeId: string }) {
        return await this.favoriteService.isFavorite(data.userId, data.placeId);
    }
}