import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from '../category.controller';
import { CategoryService } from '../category.service';

const mockCategoryService = {
  getListOnBoarding: jest.fn(),
  search: jest.fn(),
};

describe('CategoryController', () => {
  let controller: CategoryController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getListOnBoarding', () => {
    it('delegates to service.getListOnBoarding', async () => {
      const categories = [{ id: 'cat-1', name: 'Food' }];
      mockCategoryService.getListOnBoarding.mockResolvedValue(categories);

      const result = await controller.getListOnBoarding();

      expect(mockCategoryService.getListOnBoarding).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });
  });

  describe('search', () => {
    it('delegates to service.search with query and limit', async () => {
      const results = [{ id: 'cat-1', name: 'Coffee' }];
      mockCategoryService.search.mockResolvedValue(results);

      const result = await controller.search({ query: 'coff', limit: 5 });

      expect(mockCategoryService.search).toHaveBeenCalledWith('coff', 5);
      expect(result).toEqual(results);
    });

    it('propagates service errors', async () => {
      mockCategoryService.search.mockRejectedValue(new Error('Search failed'));

      await expect(controller.search({ query: 'test', limit: 10 })).rejects.toThrow('Search failed');
    });
  });
});
