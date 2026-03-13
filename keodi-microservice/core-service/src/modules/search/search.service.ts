import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSearchDto } from 'src/shared/dtos/search.dto';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class SearchService {
    constructor(private readonly prismaService: PrismaService){}

    async create(createSearchDto: CreateSearchDto) {
        try {            
            if (createSearchDto.userId) {

                const existingUser = await this.prismaService.user.findUnique({
                    where: { id: createSearchDto.userId },
                });

                if (!existingUser) {
                    throw new NotFoundException(`User not found`)
                }
            }

            return await this.prismaService.search.create({
                data: createSearchDto
            });
        } catch (error) {
            return await handleServiceErrorCatching(error)
        }
    }
}
