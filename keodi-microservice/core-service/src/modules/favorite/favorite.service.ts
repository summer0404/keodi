/* eslint-disable prettier/prettier */
import { HttpStatus, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { UserCommonPaginationDto } from "src/common/dtos/user.dto";
import { SortBy, SortOrder } from "src/common/enums/sort.enum";
import { PrismaService } from "src/database/prisma.service";

@Injectable()
export class FavoriteService {
    constructor(private readonly prismaService: PrismaService) { }

    async addFavorite(userId: string, placeId: string) {
        try {
            const place = await this.prismaService.place.findUnique({
                where: { id: placeId },
            });

            if (!place) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: "Place not found",
                });
            }

            const existing = await this.prismaService.favorite.findUnique({
                where: {
                    userId_placeId: { userId, placeId },
                },
            });

            if (existing) {
                throw new RpcException({
                    status: HttpStatus.CONFLICT,
                    message: 'Place already in favorites'
                });
            }

            return await this.prismaService.favorite.create({
                data: { userId, placeId },
            });

        } catch (error) {
            if (error instanceof RpcException) throw error;
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message
            });
        }
    }

    async removeFavorite(userId: string, placeId: string) {
        try {
            const favorite = await this.prismaService.favorite.findUnique({
                where: {
                    userId_placeId: { userId, placeId },
                },
            });

            if (!favorite) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: "Favorite not found",
                });
            }
            return await this.prismaService.favorite.delete({
                where: {
                    userId_placeId: { userId, placeId },
                },
            });
        } catch (error) {
            if (error instanceof RpcException) throw error;
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message,
            });
        }
    }

    async getUserFavorites(userCommonPaginationDto: UserCommonPaginationDto) {
        const { userId, page, limit, sortBy, sortOrder } = userCommonPaginationDto;

        try {
            const offset = (page - 1) * limit;
            const order = sortOrder.toLowerCase() as SortOrder;

            const orderByMap = {
                [SortBy.NAME]: { place: { name: order } },
                [SortBy.RATING]: { place: { rating: order } },
                [SortBy.CREATED_AT]: { createdAt: order },
            };

            const orderBy = orderByMap[sortBy] || { createdAt: order };

            const [favorites, total] = await Promise.all([
                this.prismaService.favorite.findMany({
                    where: { userId },
                    include: {
                        place: true,
                    },
                    skip: offset,
                    take: limit,
                    orderBy,
                }),
                this.prismaService.favorite.count({
                    where: { userId },
                }),
            ]);

            return {
                favorites: favorites.map(f => f.place),
                total,
                page,
                totalPages: Math.ceil(total / limit),
                limit
            };
        } catch (error) {
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message,
            });
        }
    }

    async isFavorite(userId: string, placeId: string) {
        try {
            const favorite = await this.prismaService.favorite.findUnique({
                where: {
                    userId_placeId: { userId, placeId },
                },
            });

            return { isFavorite: !!favorite };
        } catch (error) {
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message,
            });
        }
    }
}