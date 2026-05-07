import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { ReviewController } from '../review.controller';
import { ReviewService } from '../review.service';

const mockReviewService = {
  create: jest.fn(),
  getByPlaceId: jest.fn(),
  getOwnerReviews: jest.fn(),
  respondToReview: jest.fn(),
  updateResponse: jest.fn(),
  deleteResponse: jest.fn(),
  flagReview: jest.fn(),
  approveFlags: jest.fn(),
  rejectFlags: jest.fn(),
};

const ownerUser = { id: 'owner-1', role: 'OWNER' };
const adminUser = { id: 'admin-1', role: 'ADMIN' };

const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('ReviewController (api-gateway)', () => {
  let controller: ReviewController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: mockReviewService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ReviewController>(ReviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to reviewService.create with user id', async () => {
      const dto = { placeId: 'p1', rating: 5 } as any;
      mockReviewService.create.mockResolvedValue({ message: 'Review created successfully' });

      const result = await controller.create(ownerUser as any, dto);

      expect(mockReviewService.create).toHaveBeenCalledWith('owner-1', dto);
      expect(result).toEqual({ message: 'Review created successfully' });
    });
  });

  describe('getOwnerReviews', () => {
    it('delegates to reviewService.getOwnerReviews', async () => {
      const query = { page: 1, limit: 10 } as any;
      mockReviewService.getOwnerReviews.mockResolvedValue({ reviews: [] });

      await controller.getOwnerReviews(ownerUser as any, query);

      expect(mockReviewService.getOwnerReviews).toHaveBeenCalledWith('owner-1', query);
    });
  });

  describe('respondToReview', () => {
    it('delegates to reviewService.respondToReview', async () => {
      const dto = { text: 'Thanks!' };
      mockReviewService.respondToReview.mockResolvedValue({ message: 'Response added successfully' });

      await controller.respondToReview(ownerUser as any, 'rev-1', dto);

      expect(mockReviewService.respondToReview).toHaveBeenCalledWith('rev-1', 'owner-1', dto);
    });
  });

  describe('updateResponse', () => {
    it('delegates to reviewService.updateResponse', async () => {
      const dto = { text: 'Updated' };
      mockReviewService.updateResponse.mockResolvedValue({ message: 'Response updated successfully' });

      await controller.updateResponse(ownerUser as any, 'rev-1', dto);

      expect(mockReviewService.updateResponse).toHaveBeenCalledWith('rev-1', 'owner-1', dto);
    });
  });

  describe('deleteResponse', () => {
    it('delegates to reviewService.deleteResponse', async () => {
      mockReviewService.deleteResponse.mockResolvedValue({ message: 'Response deleted successfully' });

      await controller.deleteResponse(ownerUser as any, 'rev-1');

      expect(mockReviewService.deleteResponse).toHaveBeenCalledWith('rev-1', 'owner-1');
    });
  });

  describe('flagReview', () => {
    it('delegates to reviewService.flagReview', async () => {
      const dto = { reason: 'SPAM' } as any;
      mockReviewService.flagReview.mockResolvedValue({ message: 'Review flagged successfully' });

      await controller.flagReview(ownerUser as any, 'rev-1', dto);

      expect(mockReviewService.flagReview).toHaveBeenCalledWith('rev-1', 'owner-1', dto);
    });
  });

  describe('approveFlags', () => {
    it('delegates to reviewService.approveFlags', async () => {
      mockReviewService.approveFlags.mockResolvedValue({ message: 'Flag approved: review is now hidden' });

      await controller.approveFlags('rev-1');

      expect(mockReviewService.approveFlags).toHaveBeenCalledWith('rev-1');
    });
  });

  describe('rejectFlags', () => {
    it('delegates to reviewService.rejectFlags', async () => {
      mockReviewService.rejectFlags.mockResolvedValue({ message: 'Flag rejected: review remains visible' });

      await controller.rejectFlags('rev-1');

      expect(mockReviewService.rejectFlags).toHaveBeenCalledWith('rev-1');
    });
  });
});
