import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class CategoryService {
    constructor(private readonly prismaService: PrismaService) { }

    async getListOnBoarding() {
        try {
            return await this.prismaService.category.findMany({
                where: {
                    isSelectable: true
                },
            })
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
