import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { FavoriteService } from '../favorite.service';
import { PrismaService } from 'src/database/prisma.service';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';

const mockPrismaService = {
  place: { findUnique: jest.fn() },
  favorite: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('FavoriteService', () => {
  let service: FavoriteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // addFavorite
  // ──────────────────────────────────────────────
  describe('addFavorite', () => {
    it('throws NOT_FOUND when place does not exist', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(null);

      await expect(service.addFavorite('u1', 'missing')).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when favorite already exists', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrismaService.favorite.findUnique.mockResolvedValue({ userId: 'u1', placeId: 'p1' });

      await expect(service.addFavorite('u1', 'p1')).rejects.toThrow(RpcException);
    });

    it('creates and returns new favorite', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);
      mockPrismaService.favorite.create.mockResolvedValue({ userId: 'u1', placeId: 'p1' });

      const result = await service.addFavorite('u1', 'p1');

      expect(mockPrismaService.favorite.create).toHaveBeenCalled();
      expect(result).toEqual({ userId: 'u1', placeId: 'p1' });
    });
  });

  // ──────────────────────────────────────────────
  // removeFavorite
  // ──────────────────────────────────────────────
  describe('removeFavorite', () => {
    it('throws NOT_FOUND when favorite does not exist', async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);

      await expect(service.removeFavorite('u1', 'p1')).rejects.toThrow(RpcException);
    });

    it('deletes favorite and returns it', async () => {
      const fav = { userId: 'u1', placeId: 'p1' };
      mockPrismaService.favorite.findUnique.mockResolvedValue(fav);
      mockPrismaService.favorite.delete.mockResolvedValue(fav);

      const result = await service.removeFavorite('u1', 'p1');

      expect(mockPrismaService.favorite.delete).toHaveBeenCalled();
      expect(result).toEqual(fav);
    });
  });

  // ──────────────────────────────────────────────
  // getUserFavorites
  // ──────────────────────────────────────────────
  describe('getUserFavorites', () => {
    it('returns paginated favorites', async () => {
      const place = { id: 'p1', name: 'Cafe' };
      mockPrismaService.favorite.findMany.mockResolvedValue([{ place }]);
      mockPrismaService.favorite.count.mockResolvedValue(1);

      const result = await service.getUserFavorites({
        userId: 'u1',
        page: 1,
        limit: 10,
        sortBy: PlaceSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      }) as any;

      expect(result.favorites).toEqual([place]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('returns empty favorites list when user has none', async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([]);
      mockPrismaService.favorite.count.mockResolvedValue(0);

      const result = await service.getUserFavorites({
        userId: 'u1',
        page: 1,
        limit: 10,
        sortBy: PlaceSortBy.CREATED_AT,
        sortOrder: SortOrder.ASC,
      }) as any;

      expect(result.favorites).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // isFavorite
  // ──────────────────────────────────────────────
  describe('isFavorite', () => {
    it('returns isFavorite=true when entry exists', async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue({ userId: 'u1', placeId: 'p1' });

      const result = await service.isFavorite('u1', 'p1') as any;

      expect(result.isFavorite).toBe(true);
    });

    it('returns isFavorite=false when entry does not exist', async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);

      const result = await service.isFavorite('u1', 'p1') as any;

      expect(result.isFavorite).toBe(false);
    });
  });
});
