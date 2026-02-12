import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ClientKafka } from '@nestjs/microservices/client/client-kafka';
import { CreateReviewDto } from 'src/common/dtos/review.dto';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class ReviewService {
    constructor(
        private readonly prismaService: PrismaService,
        @Inject('KAFKA_SERVICE') private readonly client: ClientKafka
    ) { }

    async create(createReview: CreateReviewDto) {
        try {
            const { userId, placeId, rating, text } = createReview;

            const existingUser = await this.prismaService.user.findUnique({
                where: { id: userId },
            });

            if (!existingUser) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: 'User not found',
                });
            }

            const existingPlace = await this.prismaService.place.findUnique({
                where: { id: placeId },
            });

            if (!existingPlace) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: 'Place not found',
                });
            }

            this.client.emit('intelligence.sentiment-analysis', {
                text,
                placeId,
            });

            await this.prismaService.review.create({
                data: {
                    userId,
                    reviewerName: existingUser.lastName + ' ' + existingUser.firstName,
                    reviewerPicture: existingUser.pictureUrl,
                    placeId,
                    rating,
                    text,
                },
            });

            return { message: 'Review created successfully' };
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }
            console.error(error);
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error,
            });
        }
    }
}
