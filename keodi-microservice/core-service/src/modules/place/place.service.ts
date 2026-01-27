import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class PlaceService {
    constructor(
        private readonly prismaService: PrismaService,
    ) { }

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
