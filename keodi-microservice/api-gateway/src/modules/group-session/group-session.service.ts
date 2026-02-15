import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GroupSessionResponseDto,
  JoinGroupSessionDto,
  JoinGroupSessionResponseDto,
} from 'src/common/dtos/group-session.dto';

@Injectable()
export class GroupSessionService {
  constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

  async create(userId: string): Promise<GroupSessionResponseDto> {
    return firstValueFrom(this.client.send('group-session.create', { userId }));
  }

  async join(
    joinGroupSessionDto: JoinGroupSessionDto,
    userId?: string,
  ): Promise<JoinGroupSessionResponseDto> {
    return firstValueFrom(
      this.client.send('group-session.join', {
        ...joinGroupSessionDto,
        userId,
      }),
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
