import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from '../review.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { IntelligenceTopics, ReviewTopics } from 'src/shared/constants/topic.constant';
import { ratingActionMap } from 'src/shared/constants/review.constant';

const mockKafkaClient = {
  emit: jest.fn(),
};

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);
  });

  describe('create', () => {
    it('should emit UserAction intelligence event then call ReviewTopics.Create', async () => {
      const userId = 'user-1';
      const dto = { placeId: 'place-1', rating: 5, comment: 'Great place' } as any;
      const result = { id: 'review-1' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.create(userId, dto);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        IntelligenceTopics.UserAction,
        { userId, placeId: dto.placeId, action: ratingActionMap[dto.rating] },
      );
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.Create,
        { userId, ...dto },
      );
      expect(response).toEqual(result);
    });

    it('should emit intelligence event with correct ratingAction for rating 1', async () => {
      const userId = 'user-2';
      const dto = { placeId: 'place-2', rating: 1, comment: 'Bad' } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ id: 'review-2' });

      await service.create(userId, dto);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        IntelligenceTopics.UserAction,
        { userId, placeId: 'place-2', action: ratingActionMap[1] },
      );
    });

    it('should propagate kafka error from create', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('review create failed'));
      await expect(
        service.create('u1', { placeId: 'p1', rating: 3, comment: '' } as any),
      ).rejects.toThrow('review create failed');
    });

    it('should call sendWithTimeout with merged userId and dto fields', async () => {
      const userId = 'user-3';
      const dto = { placeId: 'place-3', rating: 4, comment: 'Good' } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({});

      await service.create(userId, dto);

      const callArgs = mockKafkaService.sendWithTimeout.mock.calls[0];
      expect(callArgs[1]).toMatchObject({ userId: 'user-3', placeId: 'place-3', rating: 4 });
    });
  });

  describe('getByPlaceId', () => {
    it('should call ReviewTopics.GetByPlaceId with dto merged with placeId', async () => {
      const dto = { page: 1, limit: 10 } as any;
      const placeId = 'place-1';
      const reviews = [{ id: 'r1' }, { id: 'r2' }];
      mockKafkaService.sendWithTimeout.mockResolvedValue(reviews);

      const result = await service.getByPlaceId(dto, placeId);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.GetByPlaceId,
        { ...dto, placeId },
      );
      expect(result).toEqual(reviews);
    });

    it('should propagate error from getByPlaceId', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('kafka down'));
      await expect(service.getByPlaceId({} as any, 'p1')).rejects.toThrow('kafka down');
    });

    it('should pass pagination params correctly', async () => {
      const dto = { page: 2, limit: 5 } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue([]);

      await service.getByPlaceId(dto, 'place-x');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.GetByPlaceId,
        { page: 2, limit: 5, placeId: 'place-x' },
      );
    });
  });

  describe('getOwnerReviews', () => {
    it('sends GetOwnerReviews topic with ownerId and query', async () => {
      const query = { page: 1, limit: 10, sortOrder: 'desc', rating: 4 } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ reviews: [] });

      await service.getOwnerReviews('owner-1', query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.GetOwnerReviews,
        { ownerId: 'owner-1', ...query },
      );
    });
  });

  describe('respondToReview', () => {
    it('sends Respond topic with reviewId, ownerId, text', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'Response added successfully' });

      await service.respondToReview('rev-1', 'owner-1', { text: 'Thanks!' });

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.Respond,
        { reviewId: 'rev-1', ownerId: 'owner-1', text: 'Thanks!' },
      );
    });
  });

  describe('updateResponse', () => {
    it('sends UpdateResponse topic', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'Response updated successfully' });

      await service.updateResponse('rev-1', 'owner-1', { text: 'Updated!' });

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.UpdateResponse,
        { reviewId: 'rev-1', ownerId: 'owner-1', text: 'Updated!' },
      );
    });
  });

  describe('deleteResponse', () => {
    it('sends DeleteResponse topic', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'Response deleted successfully' });

      await service.deleteResponse('rev-1', 'owner-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.DeleteResponse,
        { reviewId: 'rev-1', ownerId: 'owner-1' },
      );
    });
  });

  describe('flagReview', () => {
    it('sends Flag topic with reason', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'Review flagged successfully' });

      await service.flagReview('rev-1', 'owner-1', { reason: 'SPAM' as any });

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.Flag,
        { reviewId: 'rev-1', ownerId: 'owner-1', reason: 'SPAM' },
      );
    });
  });

  describe('approveFlags', () => {
    it('sends ApproveFlags topic', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'Flag approved: review is now hidden' });

      await service.approveFlags('rev-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.ApproveFlags,
        { reviewId: 'rev-1' },
      );
    });
  });

  describe('rejectFlags', () => {
    it('sends RejectFlags topic', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'Flag rejected: review remains visible' });

      await service.rejectFlags('rev-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        ReviewTopics.RejectFlags,
        { reviewId: 'rev-1' },
      );
    });
  });
});
