import { Injectable } from '@nestjs/common';
import { handleServiceErrorCatching } from 'src/common/helpers/error.helper';
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
            return handleServiceErrorCatching(error)
        }
    }
}
