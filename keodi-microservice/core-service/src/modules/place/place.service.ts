/* eslint-disable prettier/prettier */
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Place, Prisma } from '@prisma/client';
import { SortBy, SortOrder } from 'src/common/enums/sort.enum';
import { PrismaService } from 'src/database/prisma.service';

export interface PlaceWithDistance extends Place {
    distance: number;
}

@Injectable()
export class PlaceService {
    constructor(
        private readonly prismaService: PrismaService,
    ) { }

    async findNearby(
        latitude: number,
        longitude: number,
        radiusKm: number,
        page: number,
        limit: number,
        sortBy: SortBy,
        sortOrder: SortOrder
    ) {
        try {
            const latDelta = radiusKm /111;
            const lngDelta = radiusKm / (111* Math.cos((latitude * Math.PI) / 180))

            const offset = (page - 1) * limit;

            const order = sortOrder.toUpperCase();
            const orderByClause = `ORDER BY ${sortBy} ${order}`;

            const places = await this.prismaService.$queryRaw<PlaceWithDistance[]>`
                SELECT * FROM (
                    SELECT
                        id,
                        from_google as "fromGoogle",
                        name,
                        description,
                        rating,
                        google_map_link as "googleMapLink",
                        website,
                        phone_number as "phoneNumber",
                        feature_image_url as "featureImageUrl",
                        "ownerId",
                        latitude,
                        longitude,
                        full_address as "fullAddress",
                        ward,
                        street,
                        city,
                        country_code as "countryCode",
                        created_at as "createdAt",
                        updated_at as "updatedAt",
                        (
                            6371 * acos(
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
                ) AS places_with_distance
                WHERE distance <= ${radiusKm}
                ${Prisma.raw(orderByClause)}
                LIMIT ${limit}
                OFFSET ${offset}
            `;
            

            const totalResult = await this.prismaService.$queryRaw<[{ count: bigint }]>`
                SELECT COUNT(*) as count
                FROM (
                    SELECT 
                        (
                            6371 * acos(
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
                WHERE distance <= ${radiusKm}
            `;

            const total = Number(totalResult[0].count);
            const totalPages = Math.ceil(total / limit);

            return {
                places,
                total,
                page,
                totalPages,
                limit
            };
        } catch (error) {
            console.error(error);
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async getById(id: string) {
        try {
            return await this.prismaService.place.findUnique({
                where: { id },
            });
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }
}
