import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GroupSessionService } from './group-session.service';
import { GroupSessionTopics } from 'src/shared/constants/topic.constant';

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
  async getAll(@Payload() data: { userId: string }) {
    return await this.groupSessionService.getAll(data.userId);
  }
}
