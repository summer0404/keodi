import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GroupSessionService } from './group-session.service';

@Controller('group-session')
export class GroupSessionController {
  constructor(private readonly groupSessionService: GroupSessionService) {}

  @MessagePattern('group-session.create')
  async createGroupSession(@Payload() data: { userId: string }) {
    return await this.groupSessionService.create(data.userId);
  }

  @MessagePattern('group-session.join')
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

  @MessagePattern('group-session.invite-friend')
  async inviteFriend(
    @Payload() data: { sessionId: string; inviterId: string; friendId: string },
  ) {
    return await this.groupSessionService.inviteFriend(data);
  }

  @MessagePattern('group-session.close')
  async closeGroupSession(
    @Payload() data: { sessionId: string; userId: string },
  ) {
    return await this.groupSessionService.close(data);
  }

  @MessagePattern('group-session.cast-vote')
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

  @MessagePattern('group-session.finalize-member-vote')
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

  @MessagePattern('group-session.finalize-session-vote')
  async finalizeSessionVote(
    @Payload()
    data: {
      sessionId: string;
      userId: string; //TODO: check if needed
    },
  ) {
    return await this.groupSessionService.finalizeSessionVote(data);
  }

  @MessagePattern('group-session.get-votes')
  async getVotes(
    @Payload()
    data: {
      sessionId: string;
    },
  ) {
    return await this.groupSessionService.getVotes(data.sessionId);
  }

  @MessagePattern('group-session.get-session')
  async getSession(
    @Payload()
    data: {
      sessionId: string;
    },
  ) {
    return await this.groupSessionService.getSession(data.sessionId);
  }
}
