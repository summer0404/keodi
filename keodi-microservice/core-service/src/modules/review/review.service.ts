import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
    CreateReviewDto,
    DeleteResponseDto,
    FlagReviewDto,
    GetAdminReviewsDto,
    GetOwnerReviewsDto,
    GetReviewsDto,
    RespondToReviewDto,
    ReviewIdDto,
    UpdateResponseDto,
} from 'src/shared/dtos/review.dto';
import { PlaceErrorMessages, ReviewErrorMessages, UserErrorMessages } from 'src/shared/constants/error.constant';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';
import { PrismaService } from 'src/database/prisma.service';
import { PlaceService } from '../place/place.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { IntelligenceTopics, NotificationTopics } from 'src/shared/constants/topic.constant';
import { ReviewFlagStatus } from '@prisma/client';
import { NotificationPreferredChannel, NotificationType } from 'src/shared/enums/notification.enum';
import { LOW_RATING_THRESHOLD, UNNAMED_REVIEWER } from 'src/shared/constants/review.constant';

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
                    message: UserErrorMessages.USER_NOT_FOUND,
                });
            }

            const existingPlace = await this.prismaService.place.findUnique({
                where: { id: placeId },
            });

            if (!existingPlace) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: PlaceErrorMessages.PLACE_NOT_FOUND,
                });
            }

            const { lastName, firstName } = existingUser;
            const reviewerName = lastName && firstName
                ? `${lastName} ${firstName}`
                : lastName || firstName || UNNAMED_REVIEWER;

            const reviewId = await this.prismaService.$transaction(async (prisma) => {
                const review = await prisma.review.create({
                    data: {
                        userId,
                        reviewerName,
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
                this.kafkaService.getClient().emit(IntelligenceTopics.SentimentAnalysis, {
                    text,
                    placeId,
                    reviewId
                });
            }

            if (rating <= LOW_RATING_THRESHOLD && existingPlace.ownerId) {
                this.kafkaService.getClient().emit(NotificationTopics.ReviewLowRating, {
                    to: existingPlace.ownerId,
                    reviewerName,
                    rating,
                    placeName: existingPlace.name,
                    placeId,
                    reviewId,
                });

                this.kafkaService.getClient().emit(NotificationTopics.Dispatch, {
                    eventId: `review-low-rating-${reviewId}`,
                    userId: existingPlace.ownerId,
                    type: NotificationType.REVIEW_LOW_RATING,
                    title: `New ${rating}-star review on ${existingPlace.name}`,
                    body: `${reviewerName} left a ${rating}-star review. Tap to respond.`,
                    preferredChannel: NotificationPreferredChannel.BOTH,
                    data: { placeId, reviewId },
                    createdAt: new Date().toISOString(),
                });
            }

            return { message: 'Review created successfully' };
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }

    async getByPlaceId(getReviewsDto: GetReviewsDto) {
        const { placeId, limit, page, sortBy, sortOrder } = getReviewsDto;

        try {
            const existingPlace = await this.prismaService.place.findUnique({
                where: { id: placeId },
            });

            if (!existingPlace) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: PlaceErrorMessages.PLACE_NOT_FOUND,
                });
            }

            const reviews = await this.prismaService.review.findMany({
                where: { placeId, hidden: false },
                select: {
                    id: true,
                    placeId: true,
                    userId: true,
                    fromGoogle: true,
                    reviewerName: true,
                    reviewerPicture: true,
                    rating: true,
                    text: true,
                    originalLanguage: true,
                    sentimentAnalyzed: true,
                    ownerResponse: true,
                    ownerRespondedAt: true,
                    ownerResponseEditedAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
                take: limit,
                skip: (page - 1) * limit,
                orderBy: { [sortBy]: sortOrder },
            });

            const total = await this.prismaService.review.count({
                where: { placeId, hidden: false },
            });

            return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }

    async getOwnerReviews(dto: GetOwnerReviewsDto) {
        const { ownerId, limit, page, sortOrder, rating, dateFrom, dateTo, responded } = dto;

        try {
            const ownerPlaces = await this.prismaService.place.findMany({
                where: { ownerId },
                select: { id: true },
            });

            if (!ownerPlaces.length) {
                return { reviews: [], total: 0, page, limit };
            }

            const placeIds = ownerPlaces.map((p) => p.id);

            const where = {
                placeId: { in: placeIds },
                hidden: false,
                ...(rating !== undefined && { rating }),
                ...(dateFrom || dateTo
                    ? {
                        createdAt: {
                            ...(dateFrom && { gte: new Date(dateFrom) }),
                            ...(dateTo && { lte: new Date(dateTo) }),
                        },
                    }
                    : {}),
                ...(responded === true && { ownerResponse: { not: null } }),
                ...(responded === false && { ownerResponse: null }),
            };

            const [reviews, total] = await Promise.all([
                this.prismaService.review.findMany({
                    where,
                    select: {
                        id: true,
                        placeId: true,
                        userId: true,
                        fromGoogle: true,
                        reviewerName: true,
                        reviewerPicture: true,
                        rating: true,
                        text: true,
                        sentimentAnalyzed: true,
                        ownerResponse: true,
                        ownerRespondedAt: true,
                        ownerResponseEditedAt: true,
                        flagReason: true,
                        flagStatus: true,
                        createdAt: true,
                        updatedAt: true,
                        place: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: sortOrder },
                    take: limit,
                    skip: (page - 1) * limit,
                }),
                this.prismaService.review.count({ where }),
            ]);

            return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
        } catch (error) {
            return handleServiceErrorCatching(error);
        }
    }

    async respondToReview(dto: RespondToReviewDto) {
        const { reviewId, ownerId, text } = dto;

        try {
            const review = await this.prismaService.review.findUnique({
                where: { id: reviewId },
                include: { place: { select: { ownerId: true } } },
            });

            if (!review) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: ReviewErrorMessages.REVIEW_NOT_FOUND,
                });
            }

            if (review.place.ownerId !== ownerId) {
                throw new RpcException({
                    status: HttpStatus.FORBIDDEN,
                    message: ReviewErrorMessages.REVIEW_NOT_ON_YOUR_PLACE,
                });
            }

            if (review.ownerResponse !== null) {
                throw new RpcException({
                    status: HttpStatus.CONFLICT,
                    message: ReviewErrorMessages.REVIEW_ALREADY_RESPONDED,
                });
            }

            await this.prismaService.review.update({
                where: { id: reviewId },
                data: { ownerResponse: text, ownerRespondedAt: new Date() },
            });

            return { message: 'Response added successfully' };
        } catch (error) {
            return handleServiceErrorCatching(error);
        }
    }

    async updateResponse(dto: UpdateResponseDto) {
        const { reviewId, ownerId, text } = dto;

        try {
            const review = await this.prismaService.review.findUnique({
                where: { id: reviewId },
                include: { place: { select: { ownerId: true } } },
            });

            if (!review) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: ReviewErrorMessages.REVIEW_NOT_FOUND,
                });
            }

            if (review.place.ownerId !== ownerId) {
                throw new RpcException({
                    status: HttpStatus.FORBIDDEN,
                    message: ReviewErrorMessages.REVIEW_NOT_ON_YOUR_PLACE,
                });
            }

            if (review.ownerResponse === null) {
                throw new RpcException({
                    status: HttpStatus.CONFLICT,
                    message: ReviewErrorMessages.REVIEW_NOT_RESPONDED,
                });
            }

            await this.prismaService.review.update({
                where: { id: reviewId },
                data: { ownerResponse: text, ownerResponseEditedAt: new Date() },
            });

            return { message: 'Response updated successfully' };
        } catch (error) {
            return handleServiceErrorCatching(error);
        }
    }

    async deleteResponse(dto: DeleteResponseDto) {
        const { reviewId, ownerId } = dto;

        try {
            const review = await this.prismaService.review.findUnique({
                where: { id: reviewId },
                include: { place: { select: { ownerId: true } } },
            });

            if (!review) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: ReviewErrorMessages.REVIEW_NOT_FOUND,
                });
            }

            if (review.place.ownerId !== ownerId) {
                throw new RpcException({
                    status: HttpStatus.FORBIDDEN,
                    message: ReviewErrorMessages.REVIEW_NOT_ON_YOUR_PLACE,
                });
            }

            if (review.ownerResponse === null) {
                throw new RpcException({
                    status: HttpStatus.CONFLICT,
                    message: ReviewErrorMessages.REVIEW_NOT_RESPONDED,
                });
            }

            await this.prismaService.review.update({
                where: { id: reviewId },
                data: {
                    ownerResponse: null,
                    ownerRespondedAt: null,
                    ownerResponseEditedAt: null,
                },
            });

            return { message: 'Response deleted successfully' };
        } catch (error) {
            return handleServiceErrorCatching(error);
        }
    }

    async flagReview(dto: FlagReviewDto) {
        const { reviewId, ownerId, reason } = dto;

        try {
            const review = await this.prismaService.review.findUnique({
                where: { id: reviewId },
                include: { place: { select: { ownerId: true } } },
            });

            if (!review) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: ReviewErrorMessages.REVIEW_NOT_FOUND,
                });
            }

            if (review.place.ownerId !== ownerId) {
                throw new RpcException({
                    status: HttpStatus.FORBIDDEN,
                    message: ReviewErrorMessages.REVIEW_NOT_ON_YOUR_PLACE,
                });
            }

            if (review.flagStatus !== null) {
                throw new RpcException({
                    status: HttpStatus.CONFLICT,
                    message: ReviewErrorMessages.REVIEW_ALREADY_FLAGGED,
                });
            }

            await this.prismaService.review.update({
                where: { id: reviewId },
                data: { flagReason: reason, flagStatus: ReviewFlagStatus.PENDING },
            });

            return { message: 'Review flagged successfully' };
        } catch (error) {
            return handleServiceErrorCatching(error);
        }
    }

    async getAdminReviews(dto: GetAdminReviewsDto) {
        const { limit, page, sortOrder, placeId, flagStatus, rating, dateFrom, dateTo } = dto;

        try {
            const where = {
                ...(placeId && { placeId }),
                ...(flagStatus !== undefined && { flagStatus }),
                ...(rating !== undefined && { rating }),
                ...(dateFrom || dateTo
                    ? {
                        createdAt: {
                            ...(dateFrom && { gte: new Date(dateFrom) }),
                            ...(dateTo && { lte: new Date(dateTo) }),
                        },
                    }
                    : {}),
            };

            const [reviews, total] = await Promise.all([
                this.prismaService.review.findMany({
                    where,
                    select: {
                        id: true,
                        placeId: true,
                        userId: true,
                        fromGoogle: true,
                        reviewerName: true,
                        reviewerPicture: true,
                        rating: true,
                        text: true,
                        hidden: true,
                        flagReason: true,
                        flagStatus: true,
                        ownerResponse: true,
                        ownerRespondedAt: true,
                        createdAt: true,
                        updatedAt: true,
                        place: { select: { id: true, name: true, ownerId: true } },
                    },
                    orderBy: { createdAt: sortOrder },
                    take: limit,
                    skip: (page - 1) * limit,
                }),
                this.prismaService.review.count({ where }),
            ]);

            return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
        } catch (error) {
            return handleServiceErrorCatching(error);
        }
    }

    async approveFlags(dto: ReviewIdDto) {
        const { reviewId } = dto;

        try {
            const review = await this.prismaService.review.findUnique({
                where: { id: reviewId },
                include: { place: { select: { ownerId: true, name: true } } },
            });

            if (!review) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: ReviewErrorMessages.REVIEW_NOT_FOUND,
                });
            }

            if (review.flagStatus !== ReviewFlagStatus.PENDING) {
                throw new RpcException({
                    status: HttpStatus.CONFLICT,
                    message: ReviewErrorMessages.REVIEW_NO_PENDING_FLAG,
                });
            }

            await this.prismaService.review.update({
                where: { id: reviewId },
                data: { flagStatus: ReviewFlagStatus.APPROVED, hidden: true },
            });

            if (review.place.ownerId) {
                this.kafkaService.getClient().emit(NotificationTopics.ReviewFlagApproved, {
                    to: review.place.ownerId,
                    placeName: review.place.name,
                    reviewId,
                });
            }

            return { message: 'Flag approved: review is now hidden' };
        } catch (error) {
            return handleServiceErrorCatching(error);
        }
    }

    async rejectFlags(dto: ReviewIdDto) {
        const { reviewId } = dto;

        try {
            const review = await this.prismaService.review.findUnique({
                where: { id: reviewId },
                include: { place: { select: { ownerId: true, name: true } } },
            });

            if (!review) {
                throw new RpcException({
                    status: HttpStatus.NOT_FOUND,
                    message: ReviewErrorMessages.REVIEW_NOT_FOUND,
                });
            }

            if (review.flagStatus !== ReviewFlagStatus.PENDING) {
                throw new RpcException({
                    status: HttpStatus.CONFLICT,
                    message: ReviewErrorMessages.REVIEW_NO_PENDING_FLAG,
                });
            }

            await this.prismaService.review.update({
                where: { id: reviewId },
                data: { flagStatus: ReviewFlagStatus.REJECTED },
            });

            if (review.place.ownerId) {
                this.kafkaService.getClient().emit(NotificationTopics.ReviewFlagRejected, {
                    to: review.place.ownerId,
                    placeName: review.place.name,
                    reviewId,
                });
            }

            return { message: 'Flag rejected: review remains visible' };
        } catch (error) {
            return handleServiceErrorCatching(error);
        }
    }
}

