import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteController } from '../favorite.controller';
import { FavoriteService } from '../favorite.service';

const mockFavoriteService = {
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  getUserFavorites: jest.fn(),
  isFavorite: jest.fn(),
};

describe('FavoriteController', () => {
  let controller: FavoriteController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteController],
      providers: [{ provide: FavoriteService, useValue: mockFavoriteService }],
    }).compile();

    controller = module.get<FavoriteController>(FavoriteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('addFavorite – delegates to service.addFavorite', async () => {
    mockFavoriteService.addFavorite.mockResolvedValue({ userId: 'u1', placeId: 'p1' });

    const result = await controller.addFavorite({ userId: 'u1', placeId: 'p1' });

    expect(mockFavoriteService.addFavorite).toHaveBeenCalledWith('u1', 'p1');
    expect(result).toBeDefined();
  });

  it('removeFavorite – delegates to service.removeFavorite', async () => {
    mockFavoriteService.removeFavorite.mockResolvedValue({ userId: 'u1', placeId: 'p1' });

    await controller.removeFavorite({ userId: 'u1', placeId: 'p1' });

    expect(mockFavoriteService.removeFavorite).toHaveBeenCalledWith('u1', 'p1');
  });

  it('getUserFavorites – delegates to service.getUserFavorites with DTO', async () => {
    const dto = { userId: 'u1', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' } as any;
    mockFavoriteService.getUserFavorites.mockResolvedValue({ favorites: [] });

    const result = await controller.getUserFavorites(dto);

    expect(mockFavoriteService.getUserFavorites).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ favorites: [] });
  });

  it('isFavorite – delegates to service.isFavorite', async () => {
    mockFavoriteService.isFavorite.mockResolvedValue({ isFavorite: true });

    const result = await controller.isFavorite({ userId: 'u1', placeId: 'p1' });

    expect(mockFavoriteService.isFavorite).toHaveBeenCalledWith('u1', 'p1');
    expect(result).toEqual({ isFavorite: true });
  });
});
