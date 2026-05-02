import { Test, TestingModule } from '@nestjs/testing';
import { GroupSessionController } from '../group-session.controller';
import { GroupSessionService } from '../group-session.service';

const mockGroupSessionService = {
  create: jest.fn(),
  join: jest.fn(),
  inviteFriend: jest.fn(),
  close: jest.fn(),
  castVote: jest.fn(),
  finalizeMemberVote: jest.fn(),
  finalizeSessionVote: jest.fn(),
  getVotes: jest.fn(),
  getSession: jest.fn(),
  getAll: jest.fn(),
  addCandidate: jest.fn(),
  getCandidates: jest.fn(),
  deleteCandidate: jest.fn(),
  leaveSession: jest.fn(),
  updateRecommendationSearchRadius: jest.fn(),
  updateRecommendationCategories: jest.fn(),
};

describe('GroupSessionController', () => {
  let controller: GroupSessionController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupSessionController],
      providers: [{ provide: GroupSessionService, useValue: mockGroupSessionService }],
    }).compile();

    controller = module.get<GroupSessionController>(GroupSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createGroupSession', () => {
    it('delegates to service.create with userId', async () => {
      const session = { sessionId: 'sess-1', shareCode: 'ABC123' };
      mockGroupSessionService.create.mockResolvedValue(session);

      const result = await controller.createGroupSession({ userId: 'user-1' });

      expect(mockGroupSessionService.create).toHaveBeenCalledWith('user-1');
      expect(result).toBe(session);
    });
  });

  describe('join', () => {
    it('delegates to service.join with full payload', async () => {
      const joinData = { shareCode: 'ABC', userId: 'user-1', nickname: undefined, guestId: undefined };
      mockGroupSessionService.join.mockResolvedValue({ sessionId: 'sess-1' });

      await controller.join(joinData);

      expect(mockGroupSessionService.join).toHaveBeenCalledWith(joinData);
    });
  });

  describe('inviteFriend', () => {
    it('delegates to service.inviteFriend', async () => {
      const data = { sessionId: 'sess-1', inviterId: 'u1', friendId: 'u2' };
      mockGroupSessionService.inviteFriend.mockResolvedValue({ sessionId: 'sess-1' });

      await controller.inviteFriend(data);

      expect(mockGroupSessionService.inviteFriend).toHaveBeenCalledWith(data);
    });
  });

  describe('closeGroupSession', () => {
    it('delegates to service.close', async () => {
      const data = { sessionId: 'sess-1', userId: 'user-1' };
      mockGroupSessionService.close.mockResolvedValue({ sessionId: 'sess-1', status: 'CLOSED' });

      await controller.closeGroupSession(data);

      expect(mockGroupSessionService.close).toHaveBeenCalledWith(data);
    });
  });

  describe('castVote', () => {
    it('delegates to service.castVote', async () => {
      const data = { sessionId: 'sess-1', placeId: 'place-1', userId: 'user-1', guestId: undefined };
      mockGroupSessionService.castVote.mockResolvedValue({ memberId: 'm1' });

      await controller.castVote(data);

      expect(mockGroupSessionService.castVote).toHaveBeenCalledWith(data);
    });
  });

  describe('finalizeMemberVote', () => {
    it('delegates to service.finalizeMemberVote', async () => {
      const data = { sessionId: 'sess-1', userId: 'user-1', guestId: undefined };
      mockGroupSessionService.finalizeMemberVote.mockResolvedValue({ vote: {}, voteAutoFinalized: false });

      await controller.finalizeMemberVote(data);

      expect(mockGroupSessionService.finalizeMemberVote).toHaveBeenCalledWith(data);
    });
  });

  describe('finalizeSessionVote', () => {
    it('delegates to service.finalizeSessionVote', async () => {
      const data = { sessionId: 'sess-1', userId: 'user-1' };
      mockGroupSessionService.finalizeSessionVote.mockResolvedValue({ voteStatus: 'FINALIZED' });

      await controller.finalizeSessionVote(data);

      expect(mockGroupSessionService.finalizeSessionVote).toHaveBeenCalledWith(data);
    });
  });

  describe('getVotes', () => {
    it('delegates to service.getVotes with sessionId', async () => {
      mockGroupSessionService.getVotes.mockResolvedValue({ votes: [] });

      await controller.getVotes({ sessionId: 'sess-1' });

      expect(mockGroupSessionService.getVotes).toHaveBeenCalledWith('sess-1');
    });
  });

  describe('getSession', () => {
    it('delegates to service.getSession with sessionId', async () => {
      mockGroupSessionService.getSession.mockResolvedValue({ sessionId: 'sess-1' });

      await controller.getSession({ sessionId: 'sess-1' });

      expect(mockGroupSessionService.getSession).toHaveBeenCalledWith('sess-1');
    });
  });

  describe('getAll', () => {
    it('delegates to service.getAll with pagination params', async () => {
      const data = { userId: 'user-1', page: 1, limit: 10 };
      mockGroupSessionService.getAll.mockResolvedValue({ sessions: [], total: 0 });

      await controller.getAll(data);

      expect(mockGroupSessionService.getAll).toHaveBeenCalledWith('user-1', 1, 10);
    });
  });

  describe('addCandidate', () => {
    it('delegates to service.addCandidate', async () => {
      const data = { sessionId: 'sess-1', placeId: 'place-1', userId: 'user-1', guestId: undefined };
      mockGroupSessionService.addCandidate.mockResolvedValue({ placeId: 'place-1' });

      await controller.addCandidate(data);

      expect(mockGroupSessionService.addCandidate).toHaveBeenCalledWith(data);
    });
  });

  describe('getCandidates', () => {
    it('delegates to service.getCandidates with sessionId', async () => {
      mockGroupSessionService.getCandidates.mockResolvedValue({ candidates: [] });

      await controller.getCandidates({ sessionId: 'sess-1' });

      expect(mockGroupSessionService.getCandidates).toHaveBeenCalledWith('sess-1');
    });
  });

  describe('deleteCandidate', () => {
    it('delegates to service.deleteCandidate', async () => {
      const data = { sessionId: 'sess-1', placeId: 'place-1', userId: 'user-1', guestId: undefined };
      mockGroupSessionService.deleteCandidate.mockResolvedValue({ sessionId: 'sess-1', placeId: 'place-1' });

      await controller.deleteCandidate(data);

      expect(mockGroupSessionService.deleteCandidate).toHaveBeenCalledWith(data);
    });
  });

  describe('leaveSession', () => {
    it('delegates to service.leaveSession', async () => {
      const data = { sessionId: 'sess-1', userId: 'user-1', guestId: undefined };
      mockGroupSessionService.leaveSession.mockResolvedValue({ sessionId: 'sess-1' });

      await controller.leaveSession(data);

      expect(mockGroupSessionService.leaveSession).toHaveBeenCalledWith(data);
    });
  });

  describe('updateRecommendationRadius', () => {
    it('delegates to service.updateRecommendationSearchRadius', async () => {
      const data = { sessionId: 'sess-1', searchRadius: 5, userId: 'user-1', guestId: undefined };
      mockGroupSessionService.updateRecommendationSearchRadius.mockResolvedValue({ sessionId: 'sess-1', searchRadius: 5 });

      await controller.updateRecommendationRadius(data);

      expect(mockGroupSessionService.updateRecommendationSearchRadius).toHaveBeenCalledWith(data);
    });
  });

  describe('updateRecommendationCategories', () => {
    it('delegates to service.updateRecommendationCategories', async () => {
      const data = { sessionId: 'sess-1', categoryIds: ['cat-1'], userId: 'user-1', guestId: undefined };
      mockGroupSessionService.updateRecommendationCategories.mockResolvedValue({ sessionId: 'sess-1', categoryIds: ['cat-1'] });

      await controller.updateRecommendationCategories(data);

      expect(mockGroupSessionService.updateRecommendationCategories).toHaveBeenCalledWith(data);
    });
  });
});
