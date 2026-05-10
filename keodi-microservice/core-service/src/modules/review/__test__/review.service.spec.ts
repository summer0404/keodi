import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ReviewFlagStatus } from '@prisma/client';
import { ReviewService } from '../review.service';
import { PrismaService } from 'src/database/prisma.service';
import { PlaceService } from 'src/modules/place/place.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { NotificationTopics } from 'src/shared/constants/topic.constant';

const mockPrismaService = {
  user: { findUnique: jest.fn() },
  place: { findUnique: jest.fn(), findMany: jest.fn() },
  review: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockKafkaClient = { emit: jest.fn() };
const mockKafkaService = {
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};
const mockPlaceService = { updatePlaceRating: jest.fn() };

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PlaceService, useValue: mockPlaceService },
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    it('throws NOT_FOUND when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({
          userId: 'u1',
          placeId: 'p1',
          rating: 5,
          text: null,
        } as any),
      ).rejects.toThrow(RpcException);
    });

    it('throws NOT_FOUND when place does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        lastName: 'Doe',
        firstName: 'John',
        pictureUrl: null,
      });
      mockPrismaService.place.findUnique.mockResolvedValue(null);
      await expect(
        service.create({
          userId: 'u1',
          placeId: 'missing',
          rating: 5,
          text: null,
        } as any),
      ).rejects.toThrow(RpcException);
    });

    it('creates review without sentiment analysis when no text', async () => {
      const user = {
        id: 'u1',
        lastName: 'Doe',
        firstName: 'John',
        pictureUrl: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.place.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Place',
        ownerId: null,
      });
      mockPrismaService.$transaction.mockImplementation(async (fn: any) =>
        fn({
          review: { create: jest.fn().mockResolvedValue({ id: 'rev-1' }) },
        }),
      );

      const result = (await service.create({
        userId: 'u1',
        placeId: 'p1',
        rating: 5,
        text: null,
      } as any)) as any;

      expect(mockKafkaClient.emit).not.toHaveBeenCalled();
      expect(result.message).toBe('Review created successfully');
    });

    it('emits sentiment analysis event when text is provided', async () => {
      const user = {
        id: 'u1',
        lastName: 'Doe',
        firstName: 'John',
        pictureUrl: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.place.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Place',
        ownerId: null,
      });
      mockPrismaService.$transaction.mockImplementation(async (fn: any) =>
        fn({
          review: { create: jest.fn().mockResolvedValue({ id: 'rev-1' }) },
        }),
      );

      await service.create({
        userId: 'u1',
        placeId: 'p1',
        rating: 5,
        text: 'Great place!',
      } as any);

      expect(mockKafkaClient.emit).toHaveBeenCalled();
    });

    it('emits low-rating notification when rating <= 2 and place has owner', async () => {
      const user = {
        id: 'u1',
        lastName: 'Doe',
        firstName: 'John',
        pictureUrl: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.place.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Place',
        ownerId: 'owner-1',
      });
      mockPrismaService.$transaction.mockImplementation(async (fn: any) =>
        fn({
          review: { create: jest.fn().mockResolvedValue({ id: 'rev-1' }) },
        }),
      );

      await service.create({
        userId: 'u1',
        placeId: 'p1',
        rating: 2,
        text: null,
      } as any);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.ReviewLowRating,
        expect.objectContaining({ to: 'owner-1', rating: 2 }),
      );
    });

    it('does not emit low-rating notification when rating >= 3', async () => {
      const user = {
        id: 'u1',
        lastName: 'Doe',
        firstName: 'John',
        pictureUrl: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.place.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Place',
        ownerId: 'owner-1',
      });
      mockPrismaService.$transaction.mockImplementation(async (fn: any) =>
        fn({
          review: { create: jest.fn().mockResolvedValue({ id: 'rev-1' }) },
        }),
      );

      await service.create({
        userId: 'u1',
        placeId: 'p1',
        rating: 3,
        text: null,
      } as any);

      expect(mockKafkaClient.emit).not.toHaveBeenCalledWith(
        NotificationTopics.ReviewLowRating,
        expect.anything(),
      );
    });
  });

  // ──────────────────────────────────────────────
  // getByPlaceId
  // ──────────────────────────────────────────────
  describe('getByPlaceId', () => {
    it('throws NOT_FOUND when place does not exist', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(null);
      await expect(
        service.getByPlaceId({
          placeId: 'missing',
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        } as any),
      ).rejects.toThrow(RpcException);
    });

    it('returns reviews with pagination metadata excluding hidden', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrismaService.review.findMany.mockResolvedValue([{ id: 'rev-1' }]);
      mockPrismaService.review.count.mockResolvedValue(1);

      const result = (await service.getByPlaceId({
        placeId: 'p1',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as any)) as any;

      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hidden: false }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // getOwnerReviews
  // ──────────────────────────────────────────────
  describe('getOwnerReviews', () => {
    it('returns empty when owner has no places', async () => {
      mockPrismaService.place.findMany.mockResolvedValue([]);
      const result = (await service.getOwnerReviews({
        ownerId: 'o1',
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      } as any)) as any;
      expect(result.reviews).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('returns paginated reviews for owner places', async () => {
      mockPrismaService.place.findMany.mockResolvedValue([
        { id: 'p1' },
        { id: 'p2' },
      ]);
      mockPrismaService.review.findMany.mockResolvedValue([{ id: 'rev-1' }]);
      mockPrismaService.review.count.mockResolvedValue(1);

      const result = (await service.getOwnerReviews({
        ownerId: 'o1',
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      } as any)) as any;

      expect(result.reviews).toHaveLength(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ placeId: { in: ['p1', 'p2'] } }),
        }),
      );
    });

    it('applies responded=true filter', async () => {
      mockPrismaService.place.findMany.mockResolvedValue([{ id: 'p1' }]);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.review.count.mockResolvedValue(0);

      await service.getOwnerReviews({
        ownerId: 'o1',
        page: 1,
        limit: 10,
        sortOrder: 'asc',
        responded: true,
      } as any);

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerResponse: { not: null } }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // respondToReview
  // ──────────────────────────────────────────────
  describe('respondToReview', () => {
    it('throws NOT_FOUND when review does not exist', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      await expect(
        service.respondToReview({ reviewId: 'r1', ownerId: 'o1', text: 'Hi' }),
      ).rejects.toThrow(RpcException);
    });

    it('throws FORBIDDEN when owner does not own the place', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        ownerResponse: null,
        place: { ownerId: 'other-owner' },
      });
      await expect(
        service.respondToReview({ reviewId: 'r1', ownerId: 'o1', text: 'Hi' }),
      ).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when review already has a response', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        ownerResponse: 'existing',
        place: { ownerId: 'o1' },
      });
      await expect(
        service.respondToReview({ reviewId: 'r1', ownerId: 'o1', text: 'Hi' }),
      ).rejects.toThrow(RpcException);
    });

    it('saves response with ownerRespondedAt', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        ownerResponse: null,
        place: { ownerId: 'o1' },
      });
      mockPrismaService.review.update.mockResolvedValue({});

      const result = (await service.respondToReview({
        reviewId: 'r1',
        ownerId: 'o1',
        text: 'Thank you!',
      })) as any;

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining({
          ownerResponse: 'Thank you!',
          ownerRespondedAt: expect.any(Date),
        }),
      });
      expect(result.message).toBe('Response added successfully');
    });
  });

  // ──────────────────────────────────────────────
  // updateResponse
  // ──────────────────────────────────────────────
  describe('updateResponse', () => {
    it('throws CONFLICT when review has no existing response', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        ownerResponse: null,
        place: { ownerId: 'o1' },
      });
      await expect(
        service.updateResponse({ reviewId: 'r1', ownerId: 'o1', text: 'New' }),
      ).rejects.toThrow(RpcException);
    });

    it('updates response and sets ownerResponseEditedAt', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        ownerResponse: 'old',
        place: { ownerId: 'o1' },
      });
      mockPrismaService.review.update.mockResolvedValue({});

      const result = (await service.updateResponse({
        reviewId: 'r1',
        ownerId: 'o1',
        text: 'Updated!',
      })) as any;

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining({
          ownerResponse: 'Updated!',
          ownerResponseEditedAt: expect.any(Date),
        }),
      });
      expect(result.message).toBe('Response updated successfully');
    });
  });

  // ──────────────────────────────────────────────
  // deleteResponse
  // ──────────────────────────────────────────────
  describe('deleteResponse', () => {
    it('throws CONFLICT when review has no response to delete', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        ownerResponse: null,
        place: { ownerId: 'o1' },
      });
      await expect(
        service.deleteResponse({ reviewId: 'r1', ownerId: 'o1' }),
      ).rejects.toThrow(RpcException);
    });

    it('clears response fields on delete', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        ownerResponse: 'hi',
        place: { ownerId: 'o1' },
      });
      mockPrismaService.review.update.mockResolvedValue({});

      const result = (await service.deleteResponse({
        reviewId: 'r1',
        ownerId: 'o1',
      })) as any;

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: {
          ownerResponse: null,
          ownerRespondedAt: null,
          ownerResponseEditedAt: null,
        },
      });
      expect(result.message).toBe('Response deleted successfully');
    });
  });

  // ──────────────────────────────────────────────
  // flagReview
  // ──────────────────────────────────────────────
  describe('flagReview', () => {
    it('throws CONFLICT when review already has a flag', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        flagStatus: ReviewFlagStatus.PENDING,
        place: { ownerId: 'o1' },
      });
      await expect(
        service.flagReview({
          reviewId: 'r1',
          ownerId: 'o1',
          reason: 'SPAM' as any,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('sets flagReason and flagStatus PENDING', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        flagStatus: null,
        place: { ownerId: 'o1' },
      });
      mockPrismaService.review.update.mockResolvedValue({});

      const result = (await service.flagReview({
        reviewId: 'r1',
        ownerId: 'o1',
        reason: 'SPAM' as any,
      })) as any;

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { flagReason: 'SPAM', flagStatus: ReviewFlagStatus.PENDING },
      });
      expect(result.message).toBe('Review flagged successfully');
    });
  });

  // ──────────────────────────────────────────────
  // approveFlags
  // ──────────────────────────────────────────────
  describe('approveFlags', () => {
    it('throws CONFLICT when no pending flag exists', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        flagStatus: ReviewFlagStatus.REJECTED,
        place: { ownerId: 'o1', name: 'P' },
      });
      await expect(service.approveFlags({ reviewId: 'r1' })).rejects.toThrow(
        RpcException,
      );
    });

    it('sets hidden=true and flagStatus=APPROVED, emits notification', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        flagStatus: ReviewFlagStatus.PENDING,
        place: { ownerId: 'o1', name: 'Place' },
      });
      mockPrismaService.review.update.mockResolvedValue({});

      const result = (await service.approveFlags({ reviewId: 'r1' })) as any;

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { flagStatus: ReviewFlagStatus.APPROVED, hidden: true },
      });
      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.ReviewFlagApproved,
        expect.objectContaining({ to: 'o1' }),
      );
      expect(result.message).toBe('Flag approved: review is now hidden');
    });
  });

  // ──────────────────────────────────────────────
  // rejectFlags
  // ──────────────────────────────────────────────
  describe('rejectFlags', () => {
    it('sets flagStatus=REJECTED and emits notification', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'r1',
        flagStatus: ReviewFlagStatus.PENDING,
        place: { ownerId: 'o1', name: 'Place' },
      });
      mockPrismaService.review.update.mockResolvedValue({});

      const result = (await service.rejectFlags({ reviewId: 'r1' })) as any;

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { flagStatus: ReviewFlagStatus.REJECTED },
      });
      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        NotificationTopics.ReviewFlagRejected,
        expect.objectContaining({ to: 'o1' }),
      );
      expect(result.message).toBe('Flag rejected: review remains visible');
    });
  });

  // ──────────────────────────────────────────────
  // getAdminReviews
  // ──────────────────────────────────────────────
  describe('getAdminReviews', () => {
    const baseReview = {
      id: 'r1',
      placeId: 'p1',
      userId: 'u1',
      fromGoogle: false,
      reviewerName: 'John',
      reviewerPicture: null,
      rating: 3,
      text: null,
      hidden: false,
      flagReason: null,
      flagStatus: null,
      ownerResponse: null,
      ownerRespondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      place: { id: 'p1', name: 'Place', ownerId: 'o1' },
    };

    it('returns all reviews without filters', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([baseReview]);
      mockPrismaService.review.count.mockResolvedValue(1);

      const result = (await service.getAdminReviews({
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      } as any)) as any;

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, take: 10, skip: 0 }),
      );
      expect(result.reviews).toHaveLength(1);
      expect(result.totalPages).toBe(1);
    });

    it('filters by flagStatus when provided', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.review.count.mockResolvedValue(0);

      await service.getAdminReviews({
        page: 1,
        limit: 10,
        sortOrder: 'asc',
        flagStatus: ReviewFlagStatus.PENDING,
      } as any);

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { flagStatus: ReviewFlagStatus.PENDING },
        }),
      );
    });

    it('filters by placeId when provided', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.review.count.mockResolvedValue(0);

      await service.getAdminReviews({
        page: 1,
        limit: 10,
        sortOrder: 'asc',
        placeId: 'p1',
      } as any);

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { placeId: 'p1' } }),
      );
    });

    it('filters by rating and date range when provided', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.review.count.mockResolvedValue(0);

      await service.getAdminReviews({
        page: 1,
        limit: 10,
        sortOrder: 'asc',
        rating: 2,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      } as any);

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rating: 2,
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      );
    });
  });
});
