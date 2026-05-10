import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationController } from '../recommendation.controller';
import { RecommendationService } from '../recommendation.service';

const mockRecommendationService = {
  getTrending: jest.fn(),
  getForYou: jest.fn(),
  getGroupSessionRecommendations: jest.fn(),
  handleGroupSessionRecommendationCacheInvalidationEvent: jest.fn(),
};

describe('RecommendationController', () => {
  let controller: RecommendationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        { provide: RecommendationService, useValue: mockRecommendationService },
      ],
    }).compile();

    controller = module.get<RecommendationController>(RecommendationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getTrending – delegates to service.getTrending', async () => {
    mockRecommendationService.getTrending.mockResolvedValue([]);

    const result = await controller.getTrending();

    expect(mockRecommendationService.getTrending).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('getForYou – delegates to service.getForYou with userId and coordinates', async () => {
    const data = {
      userId: 'u1',
      coordinateDto: { latitude: 10.762622, longitude: 106.660172 },
    };
    mockRecommendationService.getForYou.mockResolvedValue([]);

    await controller.getForYou(data);

    expect(mockRecommendationService.getForYou).toHaveBeenCalledWith(
      'u1',
      10.762622,
      106.660172,
    );
  });

  it('getGroupSessionRecommendations – delegates to service with full payload', async () => {
    const data = { sessionId: 'sess-1', userId: 'u1', guestId: undefined };
    mockRecommendationService.getGroupSessionRecommendations.mockResolvedValue(
      [],
    );

    await controller.getGroupSessionRecommendations(data);

    expect(
      mockRecommendationService.getGroupSessionRecommendations,
    ).toHaveBeenCalledWith(data);
  });

  it('invalidateGroupSessionRecommendationCache – delegates to service handler', async () => {
    mockRecommendationService.handleGroupSessionRecommendationCacheInvalidationEvent.mockResolvedValue(
      undefined,
    );

    await controller.invalidateGroupSessionRecommendationCache({
      sessionId: 'sess-1',
    });

    expect(
      mockRecommendationService.handleGroupSessionRecommendationCacheInvalidationEvent,
    ).toHaveBeenCalledWith({ sessionId: 'sess-1' });
  });
});
