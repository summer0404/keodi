import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ClientKafka } from '@nestjs/microservices/client/client-kafka';
import { CreateReviewDto } from 'src/common/dtos/review.dto';
import { handleServiceErrorCatching } from 'src/common/helpers/error.helper';
import { PrismaService } from 'src/database/prisma.service';
import { PlaceService } from '../place/place.service';

@Injectable()
export class ReviewService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly placeService: PlaceService,
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

            

            const reviewId = await this.prismaService.$transaction(async (prisma) => {
                const review = await prisma.review.create({
                    data: {
                        userId,
                        reviewerName: existingUser.lastName + ' ' + existingUser.firstName,
                        reviewerPicture: existingUser.pictureUrl,
                        placeId,
                        rating,
                        text,
                        sentimentAnalyzed: text ? false : true,
                    },
                });

                await this.placeService.updatePlaceRating(placeId, prisma);

                return review.id;
            });

            if (text) {
                this.client.emit('intelligence.sentiment-analysis', {
                    text,
                    placeId,
                    reviewId
                });
            }

            return { message: 'Review created successfully' };
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }
}
