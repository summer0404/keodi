import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ReviewService } from '../review.service';
import { PrismaService } from 'src/database/prisma.service';
import { PlaceService } from 'src/modules/place/place.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';

const mockPrismaService = {
  user: { findUnique: jest.fn() },
  place: { findUnique: jest.fn() },
  review: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockKafkaClient = { emit: jest.fn() };
const mockKafkaService = {
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

const mockPlaceService = {
  updatePlaceRating: jest.fn(),
};

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
        service.create({ userId: 'u1', placeId: 'p1', rating: 5, text: null } as any),
      ).rejects.toThrow(RpcException);
    });

    it('throws NOT_FOUND when place does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1', lastName: 'Doe', firstName: 'John', pictureUrl: null });
      mockPrismaService.place.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ userId: 'u1', placeId: 'missing', rating: 5, text: null } as any),
      ).rejects.toThrow(RpcException);
    });

    it('creates review without sentiment analysis when no text', async () => {
      const user = { id: 'u1', lastName: 'Doe', firstName: 'John', pictureUrl: null };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.place.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          review: { create: jest.fn().mockResolvedValue({ id: 'rev-1' }) },
        };
        return fn(tx);
      });

      const result = await service.create({ userId: 'u1', placeId: 'p1', rating: 5, text: null } as any) as any;

      expect(mockKafkaClient.emit).not.toHaveBeenCalled();
      expect(result.message).toBe('Review created successfully');
    });

    it('emits sentiment analysis event when text is provided', async () => {
      const user = { id: 'u1', lastName: 'Doe', firstName: 'John', pictureUrl: null };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.place.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          review: { create: jest.fn().mockResolvedValue({ id: 'rev-1' }) },
        };
        return fn(tx);
      });

      await service.create({ userId: 'u1', placeId: 'p1', rating: 5, text: 'Great place!' } as any);

      expect(mockKafkaClient.emit).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // getByPlaceId
  // ──────────────────────────────────────────────
  describe('getByPlaceId', () => {
    it('throws NOT_FOUND when place does not exist', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(null);

      await expect(
        service.getByPlaceId({ placeId: 'missing', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('returns reviews with pagination metadata', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrismaService.review.findMany.mockResolvedValue([{ id: 'rev-1' }]);
      mockPrismaService.review.count.mockResolvedValue(1);

      const result = await service.getByPlaceId({
        placeId: 'p1', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc',
      } as any) as any;

      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });
});
