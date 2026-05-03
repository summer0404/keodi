import { Test, TestingModule } from '@nestjs/testing';
import { PlaceService } from '../place.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ReviewService } from 'src/modules/review/review.service';
import {
  PlaceTopics,
  IntelligenceTopics,
  RecommendationTopics,
} from 'src/shared/constants/topic.constant';
import { UserAction } from 'src/shared/enums/user.enum';

const mockKafkaClient = {
  emit: jest.fn(),
};

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

const mockReviewService = {
  getByPlaceId: jest.fn(),
};

describe('PlaceService', () => {
  let service: PlaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaceService,
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: ReviewService, useValue: mockReviewService },
      ],
    }).compile();

    service = module.get<PlaceService>(PlaceService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);
  });

  describe('getNearbyPlaces', () => {
    it('should call PlaceTopics.NearMe with query merged with userId', async () => {
      const query = { latitude: 10.0, longitude: 106.0, radius: 5 } as any;
      const userId = 'user-1';
      const result = { places: [] };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getNearbyPlaces(query, userId);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.NearMe,
        { ...query, userId },
      );
      expect(response).toEqual(result);
    });

    it('should propagate kafka error from getNearbyPlaces', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('kafka error'));
      await expect(service.getNearbyPlaces({} as any, 'u1')).rejects.toThrow('kafka error');
    });
  });

  describe('create', () => {
    it('should call PlaceTopics.Create with ownerId, dto, featureImage and featureImageType', async () => {
      const ownerId = 'owner-1';
      const dto = { name: 'Cafe', address: '123 Main St' } as any;
      const featureImage = Buffer.from('image');
      const featureImageType = 'image/jpeg';
      const result = { placeId: 'place-1' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.create(ownerId, dto, featureImage, featureImageType);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.Create,
        { ownerId, ...dto, featureImage, featureImageType },
      );
      expect(response).toEqual(result);
    });
  });

  describe('search', () => {
    it('should call PlaceTopics.Search with query merged with userId', async () => {
      const query = { keyword: 'cafe', latitude: 10.0, longitude: 106.0 } as any;
      const userId = 'user-2';
      const result = { places: [{ id: 'p1' }] };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.search(query, userId);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.Search,
        { ...query, userId },
      );
      expect(response).toEqual(result);
    });
  });

  describe('getById', () => {
    it('should emit UserAction.CLICK and call PlaceTopics.GetById', async () => {
      const placeId = 'place-1';
      const userId = 'user-1';
      const result = { id: placeId, name: 'Cafe' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getById(placeId, userId);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        IntelligenceTopics.UserAction,
        { userId, placeId, action: UserAction.CLICK },
      );
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.GetById,
        { id: placeId, userId },
      );
      expect(response).toEqual(result);
    });

    it('should propagate kafka error from getById', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('not found'));
      await expect(service.getById('place-x', 'user-1')).rejects.toThrow('not found');
    });
  });

  describe('getReviewsById', () => {
    it('should emit UserAction.READ_REVIEWS and delegate to reviewService', async () => {
      const dto = { page: 1, limit: 10 } as any;
      const placeId = 'place-1';
      const userId = 'user-1';
      const reviews = [{ id: 'r1' }];
      mockReviewService.getByPlaceId.mockResolvedValue(reviews);

      const result = await service.getReviewsById(dto, placeId, userId);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        IntelligenceTopics.UserAction,
        { userId, placeId, action: UserAction.READ_REVIEWS },
      );
      expect(mockReviewService.getByPlaceId).toHaveBeenCalledWith(dto, placeId);
      expect(result).toEqual(reviews);
    });

    it('should propagate error from reviewService.getByPlaceId', async () => {
      mockReviewService.getByPlaceId.mockRejectedValue(new Error('review error'));
      await expect(service.getReviewsById({} as any, 'p1', 'u1')).rejects.toThrow('review error');
    });
  });

  describe('getTrending', () => {
    it('should call RecommendationTopics.Trending with empty payload', async () => {
      const result = [{ id: 'p1' }];
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getTrending();

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        RecommendationTopics.Trending,
        {},
      );
      expect(response).toEqual(result);
    });
  });

  describe('getForYou', () => {
    it('should call RecommendationTopics.ForYou with userId and coordinateDto', async () => {
      const userId = 'user-1';
      const coordinateDto = { latitude: 10.0, longitude: 106.0 } as any;
      const result = [{ id: 'p2' }];
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getForYou(userId, coordinateDto);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        RecommendationTopics.ForYou,
        { userId, coordinateDto },
      );
      expect(response).toEqual(result);
    });
  });
});
