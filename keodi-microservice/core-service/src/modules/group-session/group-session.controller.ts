import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { GroupSessionService } from './group-session.service';
import { GroupSessionTopics } from 'src/shared/constants/topic.constant';
import {
  GetSessionActivitiesDto,
  LogRecommendationsRefreshedDto,
} from 'src/shared/dtos/group-session.dto';

@Controller('group-session')
export class GroupSessionController {
  constructor(private readonly groupSessionService: GroupSessionService) {}

  @MessagePattern(GroupSessionTopics.Create)
  async createGroupSession(@Payload() data: { userId: string }) {
    return await this.groupSessionService.create(data.userId);
  }

  @MessagePattern(GroupSessionTopics.Join)
  async join(
    @Payload()
    data: {
      shareCode: string;
      userId?: string;
      nickname?: string;
      guestId?: string;
    },
  ) {
    return await this.groupSessionService.join(data);
  }

  @MessagePattern(GroupSessionTopics.InviteFriend)
  async inviteFriend(
    @Payload() data: { sessionId: string; inviterId: string; friendId: string },
  ) {
    return await this.groupSessionService.inviteFriend(data);
  }

  @MessagePattern(GroupSessionTopics.Close)
  async closeGroupSession(
    @Payload() data: { sessionId: string; userId: string },
  ) {
    return await this.groupSessionService.close(data);
  }

  @MessagePattern(GroupSessionTopics.CastVote)
  async castVote(
    @Payload()
    data: {
      sessionId: string;
      placeId: string;
      userId?: string;
      guestId?: string;
    },
  ) {
    return await this.groupSessionService.castVote(data);
  }

  @MessagePattern(GroupSessionTopics.FinalizeMemberVote)
  async finalizeMemberVote(
    @Payload()
    data: {
      sessionId: string;
      userId?: string;
      guestId?: string;
    },
  ) {
    return await this.groupSessionService.finalizeMemberVote(data);
  }

  @MessagePattern(GroupSessionTopics.FinalizeSessionVote)
  async finalizeSessionVote(
    @Payload()
    data: {
      sessionId: string;
      userId: string; //TODO: check if needed
    },
  ) {
    return await this.groupSessionService.finalizeSessionVote(data);
  }

  @MessagePattern(GroupSessionTopics.GetVotes)
  async getVotes(
    @Payload()
    data: {
      sessionId: string;
    },
  ) {
    return await this.groupSessionService.getVotes(data.sessionId);
  }

  @MessagePattern(GroupSessionTopics.GetSession)
  async getSession(
    @Payload()
    data: {
      sessionId: string;
    },
  ) {
    return await this.groupSessionService.getSession(data.sessionId);
  }

  @MessagePattern(GroupSessionTopics.GetAll)
  async getAll(@Payload() data: { userId: string; page: number; limit: number }) {
    return await this.groupSessionService.getAll(
      data.userId,
      data.page,
      data.limit,
    );
  }

  @MessagePattern(GroupSessionTopics.AddCandidate)
  async addCandidate(
    @Payload()
    data: {
      sessionId: string;
      placeId: string;
      userId?: string;
      guestId?: string;
    },
  ) {
    return await this.groupSessionService.addCandidate(data);
  }

  @MessagePattern(GroupSessionTopics.GetCandidates)
  async getCandidates(@Payload() data: { sessionId: string }) {
    return await this.groupSessionService.getCandidates(data.sessionId);
  }

  @MessagePattern(GroupSessionTopics.DeleteCandidate)
  async deleteCandidate(
    @Payload()
    data: {
      sessionId: string;
      placeId: string;
      userId?: string;
      guestId?: string;
    },
  ) {
    return await this.groupSessionService.deleteCandidate(data);
  }

  @MessagePattern(GroupSessionTopics.LeaveSession)
  async leaveSession(
    @Payload()
    data: {
      sessionId: string;
      userId?: string;
      guestId?: string;
    },
  ) {
    return await this.groupSessionService.leaveSession(data);
  }

  @MessagePattern(GroupSessionTopics.UpdateRecommendationRadius)
  async updateRecommendationRadius(
    @Payload()
    data: {
      sessionId: string;
      searchRadius: number;
      userId?: string;
      guestId?: string;
    },
  ) {
    return await this.groupSessionService.updateRecommendationSearchRadius(data);
  }

  @MessagePattern(GroupSessionTopics.UpdateRecommendationCategories)
  async updateRecommendationCategories(
    @Payload()
    data: {
      sessionId: string;
      categoryIds: string[];
      userId?: string;
      guestId?: string;
    },
  ) {
    return await this.groupSessionService.updateRecommendationCategories(data);
  }

  @MessagePattern(GroupSessionTopics.GetActivities)
  async getActivities(@Payload() data: GetSessionActivitiesDto) {
    return await this.groupSessionService.getActivities(data);
  }

  @EventPattern(GroupSessionTopics.LogRecommendationsRefreshed)
  async logRecommendationsRefreshed(@Payload() data: LogRecommendationsRefreshedDto) {
    return await this.groupSessionService.logRecommendationsRefreshed(data);
  }
}
