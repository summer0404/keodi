import { Injectable } from '@nestjs/common';
import { CreateAttributeDto } from 'src/common/dtos/attribute.dto';
import { handleServiceErrorCatching } from 'src/common/helpers/error.helper';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AttributeService {
    constructor(private readonly prismaService: PrismaService) { }

    async create(createAttributeDto: CreateAttributeDto) {
        try {
            await this.prismaService.attribute.createMany({
                data: createAttributeDto.name.map((name) => ({ name: name.toUpperCase() })),
                skipDuplicates: true,
            });

            return { message: 'Attributes created successfully' };
        } catch (error) {
            return handleServiceErrorCatching(error)
        }

    }
}
