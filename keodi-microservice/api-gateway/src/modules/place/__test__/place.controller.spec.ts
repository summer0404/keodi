import { CacheInterceptor } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { AiSearchCreditGuard } from 'src/common/guards/ai-search-quota.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { RecommendationCacheInterceptor } from 'src/common/interceptors/recommendation-cache.interceptor';
import { PlaceController } from '../place.controller';
import { PlaceService } from '../place.service';

const mockPlaceService = {
  create: jest.fn(),
  getNearbyPlaces: jest.fn(),
  search: jest.fn(),
  getTrending: jest.fn(),
  getForYou: jest.fn(),
  getAllAdmin: jest.fn(),
  approvePlace: jest.fn(),
  rejectPlace: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  getReviewsById: jest.fn(),
};

const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };
const mockInterceptor = { intercept: jest.fn((ctx, next) => next.handle()) };

describe('PlaceController (api-gateway)', () => {
  let controller: PlaceController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaceController],
      providers: [{ provide: PlaceService, useValue: mockPlaceService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockGuard)
      .overrideGuard(AiSearchCreditGuard)
      .useValue(mockGuard)
      .overrideInterceptor(CacheInterceptor)
      .useValue(mockInterceptor)
      .overrideInterceptor(RecommendationCacheInterceptor)
      .useValue(mockInterceptor)
      .compile();

    controller = module.get<PlaceController>(PlaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllAdmin', () => {
    it('delegates to service.getAllAdmin with query', async () => {
      const query = { page: 1, limit: 10, status: 'PENDING', sortOrder: 'ASC' } as any;
      const result = { data: [], total: 0 };
      mockPlaceService.getAllAdmin.mockResolvedValue(result);

      const response = await controller.getAllAdmin(query);

      expect(mockPlaceService.getAllAdmin).toHaveBeenCalledWith(query);
      expect(response).toEqual(result);
    });

    it('propagates error from service.getAllAdmin', async () => {
      mockPlaceService.getAllAdmin.mockRejectedValue(new Error('kafka error'));
      await expect(controller.getAllAdmin({} as any)).rejects.toThrow('kafka error');
    });
  });

  describe('approvePlace', () => {
    it('delegates to service.approvePlace with placeId', async () => {
      const result = { message: 'Place approved' };
      mockPlaceService.approvePlace.mockResolvedValue(result);

      const response = await controller.approvePlace('place-1');

      expect(mockPlaceService.approvePlace).toHaveBeenCalledWith('place-1');
      expect(response).toEqual(result);
    });

    it('propagates error from service.approvePlace', async () => {
      mockPlaceService.approvePlace.mockRejectedValue(new Error('not found'));
      await expect(controller.approvePlace('place-x')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('rejectPlace', () => {
    it('delegates to service.rejectPlace with placeId and reason', async () => {
      const body = { reason: 'Incomplete information' };
      const result = { message: 'Place rejected' };
      mockPlaceService.rejectPlace.mockResolvedValue(result);

      const response = await controller.rejectPlace('place-1', body);

      expect(mockPlaceService.rejectPlace).toHaveBeenCalledWith(
        'place-1',
        body.reason,
      );
      expect(response).toEqual(result);
    });

    it('propagates error from service.rejectPlace', async () => {
      mockPlaceService.rejectPlace.mockRejectedValue(new Error('conflict'));
      await expect(
        controller.rejectPlace('place-1', { reason: 'bad' }),
      ).rejects.toThrow('conflict');
    });
  });
});
