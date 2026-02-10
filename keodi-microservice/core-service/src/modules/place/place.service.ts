import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Place, Prisma } from '@prisma/client';
import { GeoConstants } from 'src/common/constants/place.constant';
import { SortBy, SortOrder } from 'src/common/enums/sort.enum';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from '../image/image.service';
import { NearMeDto } from 'src/common/dtos/place.dto';

export interface PlaceWithDistance extends Place {
    distance: number;
    isFavorite: boolean;
}

@Injectable()
export class PlaceService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly imageService: ImageService
    ) { }

    async findNearby(nearMeDto: NearMeDto) {
        try {

            const { latitude, longitude, radius, page, limit, sortBy, sortOrder, userId } = nearMeDto;

            const latDelta = radius / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE;
            const lngDelta = radius / (GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / GeoConstants.DEGREES_IN_HALF_CIRCLE));

            const offset = (page - 1) * limit;

            const order = sortOrder.toUpperCase();
            const orderByClause = `ORDER BY ${sortBy} ${order}`;

            const rawPlaces = await this.prismaService.$queryRaw<any[]>`
                SELECT * FROM (
                    SELECT
                        p.id,
                        p.from_google as "fromGoogle",
                        p.name,
                        p.description,
                        p.rating,
                        p.google_map_link as "googleMapLink",
                        p.website,
                        p.phone_number as "phoneNumber",
                        p.feature_image_url as "featureImageUrl",
                        p.owner_id as "ownerId",
                        p.latitude,
                        p.longitude,
                        p.full_address as "fullAddress",
                        p.ward,
                        p.street,
                        p.city,
                        p.country_code as "countryCode",
                        p.created_at as "createdAt",
                        p.updated_at as "updatedAt",
                        (
                            ${GeoConstants.EARTH_RADIUS_IN_KILOMETERS} * acos(
                                cos(radians(${latitude})) 
                                * cos(radians(p.latitude)) 
                                * cos(radians(p.longitude) - radians(${longitude})) 
                                + sin(radians(${latitude})) 
                                * sin(radians(p.latitude))
                            )
                        ) AS distance
                    FROM places p
                    WHERE p.latitude BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}
                        AND p.longitude BETWEEN ${longitude - lngDelta} AND ${longitude + lngDelta}
                ) AS places_with_distance
                WHERE distance <= ${radius}
                ${Prisma.raw(orderByClause)}
                LIMIT ${limit}
                OFFSET ${offset}
            `;

            const places = await Promise.all(
                rawPlaces.map(async (place) => {
                    const placeWithFavorites = await this.prismaService.place.findUnique({
                        where: { id: place.id },
                        include: {
                            favorites: {
                                where: { userId },
                                select: { userId: true },
                            },
                        },
                    });

                    return {
                        ...place,
                        isFavorite: placeWithFavorites?.favorites && placeWithFavorites.favorites.length > 0,
                        featureImageUrl: place.featureImageUrl
                            ? await this.imageService.getImageViewUrl(place.featureImageUrl)
                            : null,
                    };
                })
            );

            const totalResult = await this.prismaService.$queryRaw<[{ count: bigint }]>`
                SELECT COUNT(*) as count
                FROM (
                    SELECT 
                        (
                            ${GeoConstants.EARTH_RADIUS_IN_KILOMETERS} * acos(
                                cos(radians(${latitude})) 
                                * cos(radians(latitude)) 
                                * cos(radians(longitude) - radians(${longitude})) 
                                + sin(radians(${latitude})) 
                                * sin(radians(latitude))
                            )
                        ) AS distance
                    FROM places
                    WHERE latitude BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}
                        AND longitude BETWEEN ${longitude - lngDelta} AND ${longitude + lngDelta}
                ) as places_with_distance
                WHERE distance <= ${radius}
            `;

            const total = Number(totalResult[0].count);
            const totalPages = Math.ceil(total / limit);

            return {
                places,
                total,
                page,
                totalPages,
                limit,
            };
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }
            console.error(error);
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error,
            });
        }
    }

    async getById(id: string, userId: string) {
        try {
            const place = await this.prismaService.place.findUnique({
                where: { id },
                include: {
                    favorites: {
                        where: { userId },
                        select: { userId: true },
                    },
                },
            });

            if (!place) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: `Place not found`,
                });
            }

            return {
                ...place,
                isFavorite: place.favorites.length > 0,
                featureImageUrl: place.featureImageUrl
                    ? await this.imageService.getImageViewUrl(place.featureImageUrl)
                    : null,
            };
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }
            console.error(error);
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error,
            });
        }
    }
}
