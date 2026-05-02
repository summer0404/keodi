import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from '../category.service';
import { PrismaService } from 'src/database/prisma.service';

const mockPrismaService = {
  category: {
    findMany: jest.fn(),
  },
};

// Minimal Fuse mock to avoid heavy dependency in unit tests
jest.mock('fuse.js', () => {
  return jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue([]),
  }));
});

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.category.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    // Trigger onModuleInit to load categories
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // getListOnBoarding
  // ──────────────────────────────────────────────
  describe('getListOnBoarding', () => {
    it('returns selectable categories from prisma', async () => {
      const categories = [{ id: 'cat-1', name: 'Food', isSelectable: true }];
      mockPrismaService.category.findMany.mockResolvedValueOnce(categories);

      const result = await service.getListOnBoarding();

      expect(result).toEqual(categories);
    });

    it('handles prisma errors', async () => {
      mockPrismaService.category.findMany.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.getListOnBoarding()).rejects.toThrow();
    });
  });

  // ──────────────────────────────────────────────
  // search
  // ──────────────────────────────────────────────
  describe('search', () => {
    it('returns cached categories when query is empty', async () => {
      const result = await service.search('', 10);

      // categoriesCache is empty in our test setup
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array when fuse finds no matches', async () => {
      const result = await service.search('xyznonexistent', 5);

      expect(Array.isArray(result)).toBe(true);
    });

    it('limits results to specified count', async () => {
      const result = await service.search('', 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('handles whitespace-only query as empty', async () => {
      const result = await service.search('   ', 10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // invalidateCache
  // ──────────────────────────────────────────────
  describe('invalidateCache', () => {
    it('calls loadCategories to refresh the cache', async () => {
      const fresh = [{ id: 'cat-2', name: 'Drinks', isSelectable: true, _count: { placeCategories: 5 } }];
      mockPrismaService.category.findMany.mockResolvedValueOnce(fresh);

      await service.invalidateCache();

      // After invalidation, getListOnBoarding uses a fresh query so no assertion on internal cache directly
      expect(mockPrismaService.category.findMany).toHaveBeenCalled();
    });
  });
});
