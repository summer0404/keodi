import { Test, TestingModule } from '@nestjs/testing';
import { ReviewController } from '../review.controller';
import { ReviewService } from '../review.service';

const mockReviewService = {
  create: jest.fn(),
  getByPlaceId: jest.fn(),
};

describe('ReviewController', () => {
  let controller: ReviewController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: mockReviewService }],
    }).compile();

    controller = module.get<ReviewController>(ReviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to service.create with full DTO', async () => {
      const dto = { userId: 'u1', placeId: 'p1', rating: 5, text: 'Great!' } as any;
      mockReviewService.create.mockResolvedValue({ message: 'Review created successfully' });

      const result = await controller.create(dto);

      expect(mockReviewService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'Review created successfully' });
    });

    it('propagates errors from service.create', async () => {
      const dto = { userId: 'u1', placeId: 'missing', rating: 5 } as any;
      mockReviewService.create.mockRejectedValue(new Error('Not found'));

      await expect(controller.create(dto)).rejects.toThrow('Not found');
    });
  });

  describe('getReviewsById', () => {
    it('delegates to service.getByPlaceId with DTO', async () => {
      const dto = { placeId: 'p1', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' } as any;
      mockReviewService.getByPlaceId.mockResolvedValue({ reviews: [], total: 0 });

      const result = await controller.getReviewsById(dto);

      expect(mockReviewService.getByPlaceId).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ reviews: [], total: 0 });
    });

    it('propagates errors from service.getByPlaceId', async () => {
      const dto = { placeId: 'missing', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' } as any;
      mockReviewService.getByPlaceId.mockRejectedValue(new Error('Place not found'));

      await expect(controller.getReviewsById(dto)).rejects.toThrow('Place not found');
    });
  });
});
