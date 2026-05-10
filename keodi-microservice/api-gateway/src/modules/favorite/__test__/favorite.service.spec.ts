import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from '../favorite.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { FavoriteTopics, IntelligenceTopics } from 'src/shared/constants/topic.constant';
import { UserAction } from 'src/shared/enums/user.enum';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';

const mockKafkaClient = {
  emit: jest.fn(),
};

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

describe('FavoriteService', () => {
  let service: FavoriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);
  });

  describe('addFavorite', () => {
    it('should emit UserAction.FAVORITE intelligence event then call FavoriteTopics.Add', async () => {
      const userId = 'user-1';
      const placeId = 'place-1';
      const result = { id: 'fav-1', userId, placeId };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.addFavorite(userId, placeId);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        IntelligenceTopics.UserAction,
        { userId, placeId, action: UserAction.FAVORITE },
      );
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FavoriteTopics.Add,
        { userId, placeId },
      );
      expect(response).toEqual(result);
    });

    it('should propagate kafka error from addFavorite', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('add favorite failed'));
      await expect(service.addFavorite('u1', 'p1')).rejects.toThrow('add favorite failed');
    });
  });

  describe('removeFavorite', () => {
    it('should call FavoriteTopics.Remove with userId and placeId', async () => {
      const userId = 'user-1';
      const placeId = 'place-1';
      const result = { id: 'fav-1', userId, placeId };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.removeFavorite(userId, placeId);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FavoriteTopics.Remove,
        { userId, placeId },
      );
      expect(response).toEqual(result);
    });

    it('should NOT emit intelligence event when removing favorite', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({});
      await service.removeFavorite('u1', 'p1');

      expect(mockKafkaClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('getUserFavorites', () => {
    it('should call FavoriteTopics.GetList with all params', async () => {
      const userId = 'user-1';
      const result = { favorites: [], total: 0 };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getUserFavorites(
        userId,
        1,
        10,
        PlaceSortBy.RATING,
        SortOrder.DESC,
      );

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FavoriteTopics.GetList,
        { userId, page: 1, limit: 10, sortBy: PlaceSortBy.RATING, sortOrder: SortOrder.DESC },
      );
      expect(response).toEqual(result);
    });

    it('should call FavoriteTopics.GetList with undefined sort params when not provided', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ favorites: [] });

      await service.getUserFavorites('u1', 1, 10);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FavoriteTopics.GetList,
        { userId: 'u1', page: 1, limit: 10, sortBy: undefined, sortOrder: undefined },
      );
    });

    it('should propagate kafka error from getUserFavorites', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('favorites error'));
      await expect(service.getUserFavorites('u1', 1, 10)).rejects.toThrow('favorites error');
    });
  });

  describe('isFavorite', () => {
    it('should call FavoriteTopics.Check with userId and placeId', async () => {
      const result = { isFavorite: true };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.isFavorite('user-1', 'place-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        FavoriteTopics.Check,
        { userId: 'user-1', placeId: 'place-1' },
      );
      expect(response).toEqual(result);
    });

    it('should return isFavorite: false for non-favorited place', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ isFavorite: false });

      const response = await service.isFavorite('user-1', 'place-99');

      expect(response).toEqual({ isFavorite: false });
    });
  });
});
