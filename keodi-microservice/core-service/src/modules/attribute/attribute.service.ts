import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { CreateAttributeDto } from 'src/common/dtos/attribute.dto';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AttributeService {
    constructor(private readonly prismaService: PrismaService) { }

    async create(createAttributeDto: CreateAttributeDto) {
        try {
            await this.prismaService.attribute.createMany({
                data: createAttributeDto.name.map((name) => ({ name })),
                skipDuplicates: true,
            });

            return { message: 'Attributes created successfully' };
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
