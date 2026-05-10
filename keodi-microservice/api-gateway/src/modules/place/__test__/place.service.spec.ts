import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from 'src/modules/review/review.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  IntelligenceTopics,
  PlaceTopics,
  RecommendationTopics,
} from 'src/shared/constants/topic.constant';
import { UserAction } from 'src/shared/enums/user.enum';
import { PlaceService } from '../place.service';

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
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('kafka error'),
      );
      await expect(service.getNearbyPlaces({} as any, 'u1')).rejects.toThrow(
        'kafka error',
      );
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

      const response = await service.create(
        ownerId,
        dto,
        featureImage,
        featureImageType,
      );

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.Create,
        { ownerId, ...dto, featureImage, featureImageType },
      );
      expect(response).toEqual(result);
    });
  });

  describe('search', () => {
    it('should call PlaceTopics.Search with query merged with userId', async () => {
      const query = {
        keyword: 'cafe',
        latitude: 10.0,
        longitude: 106.0,
      } as any;
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
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('not found'),
      );
      await expect(service.getById('place-x', 'user-1')).rejects.toThrow(
        'not found',
      );
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
      mockReviewService.getByPlaceId.mockRejectedValue(
        new Error('review error'),
      );
      await expect(
        service.getReviewsById({} as any, 'p1', 'u1'),
      ).rejects.toThrow('review error');
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

  describe('getAllAdmin', () => {
    it('should call PlaceTopics.GetAllAdmin with query', async () => {
      const query = { page: 1, limit: 10, status: 'PENDING' };
      const result = { data: [], total: 0 };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getAllAdmin(query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.GetAllAdmin,
        query,
      );
      expect(response).toEqual(result);
    });

    it('should propagate kafka error from getAllAdmin', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('kafka error'),
      );
      await expect(service.getAllAdmin({})).rejects.toThrow('kafka error');
    });
  });

  describe('approvePlace', () => {
    it('should call PlaceTopics.Approve with placeId', async () => {
      const placeId = 'place-1';
      const result = { message: 'Place approved' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.approvePlace(placeId);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.Approve,
        { placeId },
      );
      expect(response).toEqual(result);
    });

    it('should propagate kafka error from approvePlace', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('not found'),
      );
      await expect(service.approvePlace('place-x')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('rejectPlace', () => {
    it('should call PlaceTopics.Reject with placeId and data.reason', async () => {
      const placeId = 'place-1';
      const reason = 'Incomplete information';
      const result = { message: 'Place rejected' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.rejectPlace(placeId, reason);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.Reject,
        { placeId, data: { reason } },
      );
      expect(response).toEqual(result);
    });

    it('should propagate kafka error from rejectPlace', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('conflict'));
      await expect(service.rejectPlace('place-1', 'reason')).rejects.toThrow(
        'conflict',
      );
    });
  });

  describe('update', () => {
    it('should call PlaceTopics.Update with placeId, requesterId, dto fields, featureImage and featureImageType', async () => {
      const placeId = 'place-1';
      const requesterId = 'owner-1';
      const dto = { name: 'New Name' } as any;
      const featureImage = Buffer.from('img');
      const featureImageType = 'image/jpeg';
      const result = { message: 'Place updated successfully' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.update(
        placeId,
        requesterId,
        dto,
        featureImage,
        featureImageType,
      );

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        PlaceTopics.Update,
        { placeId, requesterId, ...dto, featureImage, featureImageType },
      );
      expect(response).toEqual(result);
    });

    it('should propagate kafka error from update', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('kafka error'),
      );
      await expect(service.update('p1', 'u1', {} as any)).rejects.toThrow(
        'kafka error',
      );
    });
  });
});
