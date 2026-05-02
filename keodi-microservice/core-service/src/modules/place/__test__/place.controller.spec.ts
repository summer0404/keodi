import { Test, TestingModule } from '@nestjs/testing';
import { PlaceController } from '../place.controller';
import { PlaceService } from '../place.service';

const mockPlaceService = {
  create: jest.fn(),
  findNearby: jest.fn(),
  search: jest.fn(),
  getById: jest.fn(),
};

describe('PlaceController', () => {
  let controller: PlaceController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaceController],
      providers: [{ provide: PlaceService, useValue: mockPlaceService }],
    }).compile();

    controller = module.get<PlaceController>(PlaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to service.create with full DTO', async () => {
      const dto = { name: 'Cafe', latitude: 10.0, longitude: 106.0 } as any;
      mockPlaceService.create.mockResolvedValue({ id: 'place-1' });

      const result = await controller.create(dto);

      expect(mockPlaceService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'place-1' });
    });
  });

  describe('getNearbyPlaces', () => {
    it('delegates to service.findNearby', async () => {
      const dto = { latitude: 10.0, longitude: 106.0, radius: 5 } as any;
      mockPlaceService.findNearby.mockResolvedValue([]);

      const result = await controller.getNearbyPlaces(dto);

      expect(mockPlaceService.findNearby).toHaveBeenCalledWith(dto);
      expect(result).toEqual([]);
    });
  });

  describe('search', () => {
    it('delegates to service.search', async () => {
      const dto = { query: 'coffee', page: 1, limit: 10 } as any;
      mockPlaceService.search.mockResolvedValue({ places: [], total: 0 });

      const result = await controller.search(dto);

      expect(mockPlaceService.search).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ places: [], total: 0 });
    });
  });

  describe('get', () => {
    it('delegates to service.getById with id and userId', async () => {
      mockPlaceService.getById.mockResolvedValue({ id: 'place-1', name: 'Cafe' });

      const result = await controller.get({ id: 'place-1', userId: 'user-1' });

      expect(mockPlaceService.getById).toHaveBeenCalledWith('place-1', 'user-1');
      expect(result).toEqual({ id: 'place-1', name: 'Cafe' });
    });
  });
});
