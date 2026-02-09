import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class ReviewService {
    constructor(private readonly prismaService: PrismaService) { }

    async create(){}
}
