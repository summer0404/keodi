import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  GroupSessionRecommendationAccessDto,
  GroupSessionRecommendationRefreshResponseDto,
  GroupSessionRecommendationsResponseDto,
  GroupSessionResponseDto,
  JoinGroupSessionDto,
  JoinGroupSessionResponseDto,
} from 'src/shared/dtos/group-session.dto';
import {
  GroupSessionTopics,
  RecommendationTopics,
} from 'src/shared/constants/topic.constant';

@Injectable()
export class GroupSessionService {
  constructor(
    private readonly kafkaService: KafkaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  async create(userId: string): Promise<GroupSessionResponseDto> {
    return await this.kafkaService.sendWithTimeout(GroupSessionTopics.Create, {
      userId,
    });
  }

  async join(
    joinGroupSessionDto: JoinGroupSessionDto,
    userId?: string,
  ): Promise<JoinGroupSessionResponseDto> {
    return await this.kafkaService.sendWithTimeout(GroupSessionTopics.Join, {
      ...joinGroupSessionDto,
      userId,
    });
  }

  async inviteFriend(sessionId: string, inviterId: string, friendId: string) {
    return await this.kafkaService.sendWithTimeout(
      GroupSessionTopics.InviteFriend,
      { sessionId, inviterId, friendId },
    );
  }

  async close(sessionId: string, userId: string) {
    return await this.kafkaService.sendWithTimeout(GroupSessionTopics.Close, {
      sessionId,
      userId,
    });
  }

  async castVote(
    sessionId: string,
    placeId: string,
    userId?: string,
    guestId?: string,
  ) {
    return await this.kafkaService.sendWithTimeout(
      GroupSessionTopics.CastVote,
      { sessionId, placeId, userId, guestId },
    );
  }

  async finalizeMemberVote(
    sessionId: string,
    userId?: string,
    guestId?: string,
  ) {
    return await this.kafkaService.sendWithTimeout(
      GroupSessionTopics.FinalizeMemberVote,
      { sessionId, userId, guestId },
    );
  }

  async finalizeSessionVote(sessionId: string, userId: string) {
    return await this.kafkaService.sendWithTimeout(
      GroupSessionTopics.FinalizeSessionVote,
      { sessionId, userId },
    );
  }

  async getVotes(sessionId: string) {
    return await this.kafkaService.sendWithTimeout(
      GroupSessionTopics.GetVotes,
      { sessionId },
    );
  }

  async getSession(sessionId: string) {
    return await this.kafkaService.sendWithTimeout(
      GroupSessionTopics.GetSession,
      { sessionId },
    );
  }

  async getAll(userId: string, page: number, limit: number) {
    return await this.kafkaService.sendWithTimeout(GroupSessionTopics.GetAll, {
      userId,
      page,
      limit,
    });
  }

  async addCandidate(
    sessionId: string,
    placeId: string,
    userId?: string,
    guestId?: string,
  ) {
    return await this.kafkaService.sendWithTimeout(GroupSessionTopics.AddCandidate, { sessionId, placeId, userId, guestId });
  }

  async getCandidates(sessionId: string) {
    return await this.kafkaService.sendWithTimeout(GroupSessionTopics.GetCandidates, { sessionId });
  }

  async deleteCandidate(
    sessionId: string,
    placeId: string,
    userId?: string,
    guestId?: string,
  ) {
    return await this.kafkaService.sendWithTimeout(GroupSessionTopics.DeleteCandidate, { sessionId, placeId, userId, guestId });
  }

  async leaveSession(sessionId: string, userId?: string, guestId?: string) {
    return await this.kafkaService.sendWithTimeout(GroupSessionTopics.LeaveSession, { sessionId, userId, guestId });
  }
  
   async getRecommendations(
    sessionId: string,
    userId?: string,
    accessDto?: GroupSessionRecommendationAccessDto,
  ): Promise<GroupSessionRecommendationsResponseDto> {
    return await this.kafkaService.sendWithTimeout(
      RecommendationTopics.GroupSessionGetRecommendations,
      {
        sessionId,
        userId,
        guestId: accessDto?.guestId,
      },
    );
  }

  async refreshRecommendations(
    sessionId: string,
    userId?: string,
    accessDto?: GroupSessionRecommendationAccessDto,
  ): Promise<GroupSessionRecommendationRefreshResponseDto> {
    this.cacheManager.del(
      `group-session:${sessionId}:recommendations`,
    );

    this.kafkaService.getClient().emit(RecommendationTopics.GroupSessionInvalidateCache, {
      sessionId,
      userId,
      guestId: accessDto?.guestId,
      reason: 'MANUAL_REFRESH',
    });

    return { accepted: true };
}
