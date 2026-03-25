import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { CreateReviewDto, GetReviewsDto } from 'src/shared/dtos/review.dto';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { PrismaService } from 'src/database/prisma.service';
import { PlaceService } from '../place/place.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';

@Injectable()
export class ReviewService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly placeService: PlaceService,
        private readonly kafkaService: KafkaService
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
                this.kafkaService.getClient().emit('intelligence.sentiment-analysis', {
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

    async getByPlaceId(getReviewsDto: GetReviewsDto) {
        const { 
            placeId,
            limit,
            page,
            sortBy, 
            sortOrder 
        } = getReviewsDto;

        try {
            const existingPlace = await this.prismaService.place.findUnique({
                where: { id: placeId },
            });

            if (!existingPlace) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: 'Place not found',
                });
            }

            const reviews = await this.prismaService.review.findMany({
                where: { placeId },
                take: limit,
                skip: (page - 1) * limit,
                orderBy: {
                    [sortBy]: sortOrder,
                },
            });

            const total = await this.prismaService.review.count({
                where: { placeId },
            });

            return {
                reviews,
                total,
                page,
                limit,
            };
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }
}
