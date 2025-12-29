import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PlaceService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly userService: UserService
    ) { }

    async forYouForNewMembers(
        lng: number, 
        lat: number, 
        radius: number, 
        limit: number
    ) {
        try {
            

            const places = await this.prismaService.$queryRaw<any[]>`
                SELECT p.id, p.name, p.latitude, p.longitude,
                    ST_Distance_Sphere(
                    point(p.longitude, p.latitude), 
                    point(${lng}, ${lat})
                    ) AS distance
                FROM Place p
                WHERE p.distance <= ${radius}
                ORDER BY distance ASC
                LIMIT 50;
                `;

            return places.slice(0, limit);
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

    async create() {
        try {
            // await this.prismaService.$queryRaw`
            // INSERT INTO "Place" (
            //     id,
            //     name,
            //     "altName",
            //     amenity,
            //     brand,
            //     cuisine,
            //     street,
            //     "houseNumber",
            //     phone,
            //     "openingHours",
            //     "internetAccess",
            //     takeaway,
            //     wheelchair,
            //     operator,
            //     "checkDate",
            //     "createdAt",
            //     "updatedAt",
            //     geom
            // ) VALUES (
            //     ${props['@id']},
            //     ${props.name},
            //     ${props.alt_name ?? null},
            //     ${props.amenity ?? null},
            //     ${props.brand ?? null},
            //     ${props.cuisine ?? null},
            //     ${props['addr:street'] ?? null},
            //     ${props['addr:housenumber'] ?? null},
            //     ${props.phone ?? null},
            //     ${props.opening_hours ?? null},
            //     ${props.internet_access ?? null},
            //     ${props.takeaway ? true : false},
            //     ${props.wheelchair ? true : false},
            //     ${props.operator ?? null},
            //     ${props.check_date ? new Date(props.check_date) : null},
            //     CURRENT_TIMESTAMP,
            //     CURRENT_TIMESTAMP,
            //     ST_GeogFromText(${`SRID=4326;POINT(${coords[0]} ${coords[1]})`})
            // )
            // `;
        } catch (error) {
        }
    }

}
