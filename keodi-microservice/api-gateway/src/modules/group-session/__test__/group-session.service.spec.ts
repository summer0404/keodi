import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import {
  GroupSessionTopics,
  RecommendationTopics,
} from 'src/shared/constants/topic.constant';
import { GroupSessionService } from '../group-session.service';

const mockKafkaClient = {
  emit: jest.fn(),
};

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

const mockCacheManager = {
  del: jest.fn(),
};

describe('GroupSessionService', () => {
  let service: GroupSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupSessionService,
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<GroupSessionService>(GroupSessionService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);
  });

  describe('create', () => {
    it('should call GroupSessionTopics.Create with userId', async () => {
      const result = { sessionId: 'session-1' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.create('user-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.Create,
        { userId: 'user-1' },
      );
      expect(response).toEqual(result);
    });
  });

  describe('join', () => {
    it('should call GroupSessionTopics.Join with dto merged with userId', async () => {
      const dto = { sessionId: 'session-1', inviteCode: 'code123' } as any;
      const result = { memberId: 'member-1' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.join(dto, 'user-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.Join,
        { ...dto, userId: 'user-1' },
      );
      expect(response).toEqual(result);
    });

    it('should join without userId (guest flow)', async () => {
      const dto = { sessionId: 'session-1', inviteCode: 'code123' } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        guestId: 'guest-1',
      });

      await service.join(dto, undefined);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.Join,
        { ...dto, userId: undefined },
      );
    });
  });

  describe('inviteFriend', () => {
    it('should call GroupSessionTopics.InviteFriend with sessionId, inviterId, friendId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        message: 'invited',
      });

      await service.inviteFriend('session-1', 'inviter-1', 'friend-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.InviteFriend,
        {
          sessionId: 'session-1',
          inviterId: 'inviter-1',
          friendId: 'friend-1',
        },
      );
    });
  });

  describe('close', () => {
    it('should call GroupSessionTopics.Close with sessionId and userId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'closed' });

      await service.close('session-1', 'user-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.Close,
        { sessionId: 'session-1', userId: 'user-1' },
      );
    });
  });

  describe('castVote', () => {
    it('should call GroupSessionTopics.CastVote with all params', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        message: 'vote cast',
      });

      await service.castVote('session-1', 'place-1', 'user-1', undefined);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.CastVote,
        {
          sessionId: 'session-1',
          placeId: 'place-1',
          userId: 'user-1',
          guestId: undefined,
        },
      );
    });
  });

  describe('finalizeMemberVote', () => {
    it('should call GroupSessionTopics.FinalizeMemberVote', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        message: 'vote finalized',
      });

      await service.finalizeMemberVote('session-1', 'user-1', undefined);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.FinalizeMemberVote,
        { sessionId: 'session-1', userId: 'user-1', guestId: undefined },
      );
    });
  });

  describe('finalizeSessionVote', () => {
    it('should call GroupSessionTopics.FinalizeSessionVote with sessionId and userId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ winner: 'place-1' });

      const result = await service.finalizeSessionVote('session-1', 'user-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.FinalizeSessionVote,
        { sessionId: 'session-1', userId: 'user-1' },
      );
    });
  });

  describe('getVotes', () => {
    it('should call GroupSessionTopics.GetVotes with sessionId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ votes: [] });

      await service.getVotes('session-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.GetVotes,
        { sessionId: 'session-1' },
      );
    });
  });

  describe('getSession', () => {
    it('should call GroupSessionTopics.GetSession with sessionId', async () => {
      const result = { id: 'session-1', members: [] };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getSession('session-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.GetSession,
        { sessionId: 'session-1' },
      );
      expect(response).toEqual(result);
    });
  });

  describe('getAll', () => {
    it('should call GroupSessionTopics.GetAll with userId, page, limit', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ sessions: [] });

      await service.getAll('user-1', 1, 10);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.GetAll,
        { userId: 'user-1', page: 1, limit: 10 },
      );
    });
  });

  describe('addCandidate', () => {
    it('should call GroupSessionTopics.AddCandidate with all params', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        message: 'candidate added',
      });

      await service.addCandidate('session-1', 'place-1', 'user-1', undefined);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.AddCandidate,
        {
          sessionId: 'session-1',
          placeId: 'place-1',
          userId: 'user-1',
          guestId: undefined,
        },
      );
    });
  });

  describe('getCandidates', () => {
    it('should call GroupSessionTopics.GetCandidates with sessionId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ candidates: [] });

      await service.getCandidates('session-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.GetCandidates,
        { sessionId: 'session-1' },
      );
    });
  });

  describe('deleteCandidate', () => {
    it('should call GroupSessionTopics.DeleteCandidate with all params', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        message: 'deleted',
      });

      await service.deleteCandidate(
        'session-1',
        'place-1',
        'user-1',
        undefined,
      );

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.DeleteCandidate,
        {
          sessionId: 'session-1',
          placeId: 'place-1',
          userId: 'user-1',
          guestId: undefined,
        },
      );
    });
  });

  describe('leaveSession', () => {
    it('should call GroupSessionTopics.LeaveSession with sessionId, userId, guestId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'left' });

      await service.leaveSession('session-1', 'user-1', undefined);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.LeaveSession,
        { sessionId: 'session-1', userId: 'user-1', guestId: undefined },
      );
    });
  });

  describe('getRecommendations', () => {
    it('should call RecommendationTopics.GroupSessionGetRecommendations with sessionId, userId, guestId', async () => {
      const result = { places: [] };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getRecommendations('session-1', 'user-1', {
        guestId: undefined,
      });

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        RecommendationTopics.GroupSessionGetRecommendations,
        { sessionId: 'session-1', userId: 'user-1', guestId: undefined },
      );
      expect(response).toEqual(result);
    });
  });

  describe('updateRecommendationRadius', () => {
    it('should call kafka, invalidate cache and return updated radius', async () => {
      const updatedRadius = { searchRadius: 10 };
      mockKafkaService.sendWithTimeout.mockResolvedValue(updatedRadius);
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.updateRecommendationRadius(
        'session-1',
        'user-1',
        { searchRadius: 10, guestId: undefined } as any,
      );

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.UpdateRecommendationRadius,
        expect.objectContaining({ sessionId: 'session-1', searchRadius: 10 }),
      );
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        RedisKeys.RECOMMENDATION.GROUP_SESSION_RECOMMENDATIONS('session-1'),
      );
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        RecommendationTopics.GroupSessionInvalidateCache,
        expect.objectContaining({
          sessionId: 'session-1',
          reason: 'SEARCH_RADIUS_UPDATED',
        }),
      );
      expect(result).toEqual(updatedRadius);
    });
  });

  describe('updateRecommendationCategories', () => {
    it('should call kafka, invalidate cache and return updated categories', async () => {
      const updatedCategories = { categoryIds: ['cat-1', 'cat-2'] };
      mockKafkaService.sendWithTimeout.mockResolvedValue(updatedCategories);
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.updateRecommendationCategories(
        'session-1',
        'user-1',
        { categoryIds: ['cat-1', 'cat-2'], guestId: undefined } as any,
      );

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.UpdateRecommendationCategories,
        expect.objectContaining({
          sessionId: 'session-1',
          categoryIds: ['cat-1', 'cat-2'],
        }),
      );
      expect(mockCacheManager.del).toHaveBeenCalled();
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        RecommendationTopics.GroupSessionInvalidateCache,
        expect.objectContaining({ reason: 'SELECTED_CATEGORIES_UPDATED' }),
      );
      expect(result).toEqual(updatedCategories);
    });
  });

  describe('refreshRecommendations', () => {
    it('should invalidate cache and return accepted: true', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.refreshRecommendations(
        'session-1',
        'user-1',
        { guestId: undefined },
      );

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        RedisKeys.RECOMMENDATION.GROUP_SESSION_RECOMMENDATIONS('session-1'),
      );
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        RecommendationTopics.GroupSessionInvalidateCache,
        expect.objectContaining({
          sessionId: 'session-1',
          reason: 'MANUAL_REFRESH',
        }),
      );
      expect(result).toEqual({ accepted: true });
    });

    it('should still return accepted: true when no userId or accessDto', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.refreshRecommendations('session-1');

      expect(result).toEqual({ accepted: true });
    });

    it('should emit LogRecommendationsRefreshed event after invalidation', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.refreshRecommendations('session-1', 'user-1');

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        GroupSessionTopics.LogRecommendationsRefreshed,
        expect.objectContaining({ sessionId: 'session-1', userId: 'user-1' }),
      );
    });
  });

  describe('getActivities', () => {
    it('sends GetActivities topic with sessionId, userId, guestId', async () => {
      const expected = { activities: [] };
      mockKafkaService.sendWithTimeout.mockResolvedValue(expected);

      const result = await service.getActivities('sess-1', 'user-1', undefined);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.GetActivities,
        { sessionId: 'sess-1', userId: 'user-1', guestId: undefined },
      );
      expect(result).toEqual(expected);
    });

    it('sends GetActivities topic with guestId for guest access', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ activities: [] });

      await service.getActivities('sess-1', undefined, 'guest-abc');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        GroupSessionTopics.GetActivities,
        { sessionId: 'sess-1', userId: undefined, guestId: 'guest-abc' },
      );
    });
  });
});
