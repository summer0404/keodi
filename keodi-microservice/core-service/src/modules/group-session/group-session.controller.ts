import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GroupSessionService } from './group-session.service';

@Controller('group-session')
export class GroupSessionController {
  constructor(private readonly groupSessionService: GroupSessionService) {}

  @MessagePattern('group-session.create')
  async createGroupSession(@Payload() data: { userId: string }) {
    return this.groupSessionService.create(data.userId);
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
    return this.groupSessionService.join(data);
  }

  @MessagePattern('group-session.invite-friend')
  async inviteFriend(
    @Payload() data: { sessionId: string; inviterId: string; friendId: string },
  ) {
    return this.groupSessionService.inviteFriend(data);
  }

  @MessagePattern('group-session.close')
  async closeGroupSession(
    @Payload() data: { sessionId: string; userId: string },
  ) {
    return this.groupSessionService.close(data);
  }
}
