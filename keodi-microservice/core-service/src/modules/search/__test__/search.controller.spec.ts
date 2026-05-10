import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '../search.controller';
import { SearchService } from '../search.service';

const mockSearchService = {
  create: jest.fn(),
  getTrending: jest.fn(),
  updateTrendingForRedis: jest.fn(),
};

describe('SearchController', () => {
  let controller: SearchController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: mockSearchService }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create – delegates to service.create with DTO', async () => {
    const dto = { rawQuery: 'coffee', extractedTerm: 'coffee', userId: 'u1' } as any;
    mockSearchService.create.mockResolvedValue({ id: 'search-1' });

    await controller.create(dto);

    expect(mockSearchService.create).toHaveBeenCalledWith(dto);
  });

  it('getTrending – delegates to service.getTrending', async () => {
    mockSearchService.getTrending.mockResolvedValue([]);

    const result = await controller.getTrending();

    expect(mockSearchService.getTrending).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('updateTrendingForRedis – delegates to service.updateTrendingForRedis', async () => {
    const payload = { trendingSearches: [{ extractedTerm: 'coffee', score: 5 }] };
    mockSearchService.updateTrendingForRedis.mockResolvedValue(undefined);

    await controller.updateTrendingForRedis(payload);

    expect(mockSearchService.updateTrendingForRedis).toHaveBeenCalledWith(payload.trendingSearches);
  });
});
