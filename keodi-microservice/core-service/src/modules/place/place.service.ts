import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Place, Prisma } from '@prisma/client';
import { GeoConstants } from 'src/common/constants/place.constant';
import { FriendSortBy, SortBy, SortOrder } from 'src/common/enums/sort.enum';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from '../image/image.service';
import { NearMeDto, SearchDto } from 'src/common/dtos/place.dto';
import { SearchMode } from 'src/common/enums/search.enum';
import { handleServiceErrorCatching } from 'src/common/helpers/error.helper';

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

    private calculateGeoDeltas(latitude: number, radius: number) {
        const latDelta = radius / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE;
        const lngDelta = radius / (GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / GeoConstants.DEGREES_IN_HALF_CIRCLE));
        return { latDelta, lngDelta };
    }

    private buildPaginationParams(page: number, limit: number, sortBy: SortBy | FriendSortBy, sortOrder: SortOrder) {
        const offset = (page - 1) * limit;
        const order = sortOrder.toUpperCase();
        const orderByClause = `ORDER BY ${sortBy} ${order}`;
        return { offset, orderByClause };
    }

    private buildSearchCondition(searchPattern?: string) {
        if (!searchPattern) {
            return Prisma.empty;
        }
        return Prisma.sql`
            AND (
                LOWER(p.name) LIKE LOWER(${searchPattern})
                OR LOWER(p.full_address) LIKE LOWER(${searchPattern})
                OR LOWER(p.street) LIKE LOWER(${searchPattern})
                OR LOWER(p.ward) LIKE LOWER(${searchPattern})
                OR LOWER(p.city) LIKE LOWER(${searchPattern})
            )
        `;
    }

    private buildSearchConditionForCount(searchPattern?: string) {
        if (!searchPattern) {
            return Prisma.empty;
        }
        return Prisma.sql`
            AND (
                LOWER(name) LIKE LOWER(${searchPattern})
                OR LOWER(full_address) LIKE LOWER(${searchPattern})
                OR LOWER(street) LIKE LOWER(${searchPattern})
                OR LOWER(ward) LIKE LOWER(${searchPattern})
                OR LOWER(city) LIKE LOWER(${searchPattern})
            )
        `;
    }

    private async enrichPlacesWithFavoriteAndImage(rawPlaces: any[], userId: string): Promise<PlaceWithDistance[]> {
        return await Promise.all(
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
    }

    private async queryPlacesInRadiusWithDistance(
        latitude: number,
        longitude: number,
        latDelta: number,
        lngDelta: number,
        radius: number,
        orderByClause: string,
        limit: number,
        offset: number,
        searchPattern?: string
    ): Promise<any[]> {
        const searchCondition = this.buildSearchCondition(searchPattern);

        return await this.prismaService.$queryRaw<any[]>`
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
                    ${searchCondition}
            ) AS places_with_distance
            WHERE distance <= ${radius}
            ${Prisma.raw(orderByClause)}
            LIMIT ${limit}
            OFFSET ${offset}
        `;
    }

    private async countPlacesInRadius(
        latitude: number,
        longitude: number,
        latDelta: number,
        lngDelta: number,
        radius: number,
        searchPattern?: string
    ): Promise<number> {
        const searchCondition = this.buildSearchConditionForCount(searchPattern);

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
                    ${searchCondition}
            ) as places_with_distance
            WHERE distance <= ${radius}
        `;

        return Number(totalResult[0].count);
    }

    async findNearby(nearMeDto: NearMeDto) {
        const { 
            latitude, 
            longitude, 
            radius, 
            page, 
            limit, 
            sortBy, 
            sortOrder, 
            userId 
        } = nearMeDto;

        const { latDelta, lngDelta } = this.calculateGeoDeltas(latitude, radius);

        const { offset, orderByClause } = this.buildPaginationParams(page, limit, sortBy, sortOrder);

        try {
            const rawPlaces = await this.queryPlacesInRadiusWithDistance(
                latitude,
                longitude,
                latDelta,
                lngDelta,
                radius,
                orderByClause,
                limit,
                offset
            );

            const places = await this.enrichPlacesWithFavoriteAndImage(rawPlaces, userId);

            const total = await this.countPlacesInRadius(latitude, longitude, latDelta, lngDelta, radius);
            const totalPages = Math.ceil(total / limit);

            return {
                places,
                total,
                page,
                totalPages,
                limit,
            };
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }

    async search(searchDto: SearchDto) {
        const {
            search,
            mode,
            userId,
            latitude,
            longitude,
            radius,
            limit,
            page,
            sortBy,
            sortOrder
        } = searchDto;


        const { latDelta, lngDelta } = this.calculateGeoDeltas(latitude, radius);

        const { offset, orderByClause } = this.buildPaginationParams(page, limit, sortBy, sortOrder);

        try {
            if (mode === SearchMode.KEYWORD) {
                const searchPattern = `%${search}%`;
                
                const rawPlaces = await this.queryPlacesInRadiusWithDistance(
                    latitude,
                    longitude,
                    latDelta,
                    lngDelta,
                    radius,
                    orderByClause,
                    limit,
                    offset,
                    searchPattern
                );

                const places = await this.enrichPlacesWithFavoriteAndImage(rawPlaces, userId);

                const total = await this.countPlacesInRadius(
                    latitude,
                    longitude,
                    latDelta,
                    lngDelta,
                    radius,
                    searchPattern
                );
                const totalPages = Math.ceil(total / limit);

                return {
                    places,
                    total,
                    page,
                    totalPages,
                    limit,
                };
            } else if ( mode === SearchMode.CONTEXTUAL) {
                // TODO: Implement contextual search
            }
        } catch (error) {
            return handleServiceErrorCatching(error)
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
            return handleServiceErrorCatching(error)
        }
    }
}
