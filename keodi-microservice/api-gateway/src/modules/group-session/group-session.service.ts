import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GroupSessionResponseDto,
  JoinGroupSessionResponseDto,
} from 'src/common/dtos/group-session.dto';

@Injectable()
export class GroupSessionService {
  constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

  async create(userId: string): Promise<GroupSessionResponseDto> {
    return firstValueFrom(this.client.send('group-session.create', { userId }));
  }

  async join(
    shareCode: string,
    userId?: string,
    nickname?: string,
    guestId?: string,
  ): Promise<JoinGroupSessionResponseDto> {
    const payload: {
      shareCode: string;
      userId?: string;
      nickname?: string;
      guestId?: string;
    } = { shareCode };

    if (userId) payload.userId = userId;
    if (nickname) payload.nickname = nickname;
    if (guestId) payload.guestId = guestId;

    return firstValueFrom(
      this.client.send('group-session.join', payload),
    );
  }

  async inviteFriend(sessionId: string, inviterId: string, friendId: string) {
    return firstValueFrom(
      this.client.send('group-session.invite-friend', {
        sessionId,
        inviterId,
        friendId,
      }),
    );
  }

  async close(sessionId: string, userId: string) {
  return firstValueFrom(
    this.client.send('group-session.close', { sessionId, userId }),
  );
}
}
