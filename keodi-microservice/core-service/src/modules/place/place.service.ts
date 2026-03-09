import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { Prisma } from '@prisma/client';
import { GeoConstants } from 'src/common/constants/place.constant';
import { PlaceSortBy, SortOrder } from 'src/common/enums/sort.enum';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from '../image/image.service';
import { NearMeDto, SearchDto } from 'src/common/dtos/place.dto';
import { SearchMode } from 'src/common/enums/search.enum';
import { handleServiceErrorCatching } from 'src/common/helpers/error.helper';
import { firstValueFrom } from 'rxjs';
import { PlaceWithDistance } from 'src/common/interfaces/place.interface';

@Injectable()
export class PlaceService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly imageService: ImageService,
        @Inject('KAFKA_SERVICE') private readonly clientKafka: ClientKafka
    ) { }

    private calculateGeoDeltas(latitude: number, radius: number) {
        const latDelta = radius / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE;
        const longDelta = radius / (GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / GeoConstants.DEGREES_IN_HALF_CIRCLE));
        return { latDelta, longDelta };
    }

    private buildPaginationParams(page: number, limit: number, sortBy: PlaceSortBy, sortOrder: SortOrder) {
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

    private buildCategoryCondition(categories?: string[]) {
        if (!categories || categories.length === 0) {
            return Prisma.empty;
        }

        const categoryConditions = categories.map(category =>
            Prisma.sql`UPPER(c.name) = UPPER(${category})`
        );

        return Prisma.sql`
            AND p.id IN (
                SELECT pc.place_id
                FROM place_categories pc
                JOIN categories c ON pc.category_id = c.id
                WHERE ${Prisma.join(categoryConditions, ' OR ')}
            )
        `;
    }

    private buildHasAttributeSelect(attributes?: string[]) {
        if (!attributes || attributes.length === 0) {
            return Prisma.sql`0 AS has_attributes`;
        }

        const attributeConditions = attributes.map(attr =>
            Prisma.sql`a.name = ${attr}`
        );

        return Prisma.sql`
            CASE WHEN EXISTS (
                SELECT 1
                FROM place_attributes pa
                JOIN attributes a ON pa.attribute_id = a.id
                WHERE pa.place_id = p.id
                    AND (${Prisma.join(attributeConditions, ' OR ')})
            ) THEN 1 ELSE 0 END AS has_attributes
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
        longDelta: number,
        radius: number,
        orderByClause: string,
        limit: number,
        offset: number,
        searchPattern?: string,
        categories?: string[],
        attributes?: string[]
    ): Promise<any[]> {
        const searchCondition = this.buildSearchCondition(searchPattern);
        const categoryCondition = this.buildCategoryCondition(categories);
        const hasAttributeSelect = this.buildHasAttributeSelect(attributes);

        const finalOrderBy = attributes && attributes.length > 0
            ? Prisma.raw('ORDER BY has_attributes DESC, distance ASC')
            : Prisma.raw(orderByClause);

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
                    ) AS distance,
                    ${hasAttributeSelect}
                FROM places p
                WHERE p.latitude BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}
                    AND p.longitude BETWEEN ${longitude - longDelta} AND ${longitude + longDelta}
                    ${searchCondition}
                    ${categoryCondition}
            ) AS places_with_distance
            WHERE distance <= ${radius}
            ${finalOrderBy}
            LIMIT ${limit}
            OFFSET ${offset}
        `;
    }

    private async countPlacesInRadius(
        latitude: number,
        longitude: number,
        latDelta: number,
        longDelta: number,
        radius: number,
        searchPattern?: string,
        categories?: string[]
    ): Promise<number> {
        const searchCondition = this.buildSearchConditionForCount(searchPattern);
        const categoryCondition = this.buildCategoryCondition(categories);

        const totalResult = await this.prismaService.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count
            FROM (
                SELECT 
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
                    AND p.longitude BETWEEN ${longitude - longDelta} AND ${longitude + longDelta}
                    ${searchCondition}
                    ${categoryCondition}
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

        const { latDelta, longDelta } = this.calculateGeoDeltas(latitude, radius);

        const { offset, orderByClause } = this.buildPaginationParams(page, limit, sortBy, sortOrder);

        try {
            const rawPlaces = await this.queryPlacesInRadiusWithDistance(
                latitude,
                longitude,
                latDelta,
                longDelta,
                radius,
                orderByClause,
                limit,
                offset
            );

            const places = await this.enrichPlacesWithFavoriteAndImage(rawPlaces, userId);

            const total = await this.countPlacesInRadius(latitude, longitude, latDelta, longDelta, radius);
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


        const { latDelta, longDelta } = this.calculateGeoDeltas(latitude, radius);

        const { offset, orderByClause } = this.buildPaginationParams(page, limit, sortBy, sortOrder);

        try {
            if (mode === SearchMode.KEYWORD) {
                const searchPattern = `%${search}%`;

                const rawPlaces = await this.queryPlacesInRadiusWithDistance(
                    latitude,
                    longitude,
                    latDelta,
                    longDelta,
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
                    longDelta,
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
            } else if (mode === SearchMode.CONTEXTUAL) {
                const extractedIntent = await firstValueFrom(
                    this.clientKafka.send('intelligence.extract-user-intent', { search })
                );

                const keywordPattern = extractedIntent.keywords ? `%${extractedIntent.keywords}%` : undefined;

                // Ưu tiên keyword hơn là categories
                const categoriesToUse = extractedIntent.keywords ? undefined : extractedIntent.categories;

                const rawPlaces = await this.queryPlacesInRadiusWithDistance(
                    latitude,
                    longitude,
                    latDelta,
                    longDelta,
                    radius,
                    orderByClause,
                    limit,
                    offset,
                    keywordPattern,
                    categoriesToUse,
                    extractedIntent.attributes
                );

                const places = await this.enrichPlacesWithFavoriteAndImage(rawPlaces, userId);

                const total = await this.countPlacesInRadius(
                    latitude,
                    longitude,
                    latDelta,
                    longDelta,
                    radius,
                    keywordPattern,
                    categoriesToUse
                );
                const totalPages = Math.ceil(total / limit);

                return {
                    places,
                    total,
                    page,
                    totalPages,
                    limit,
                };
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

    async updatePlaceRating(placeId: string, prisma?: Prisma.TransactionClient) {
        try {
            await (prisma || this.prismaService).$executeRaw`
                UPDATE places 
                SET rating = COALESCE((
                    SELECT AVG(rating) 
                    FROM reviews 
                    WHERE place_id = ${placeId}
                ), 0)
                WHERE id = ${placeId}
            `;
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }
}
