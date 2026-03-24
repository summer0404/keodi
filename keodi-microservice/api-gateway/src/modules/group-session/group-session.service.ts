import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
    GroupSessionResponseDto,
    JoinGroupSessionDto,
    JoinGroupSessionResponseDto,
} from 'src/shared/dtos/group-session.dto';

@Injectable()
export class GroupSessionService {
  constructor(private readonly kafkaService: KafkaService) {}

  async create(userId: string): Promise<GroupSessionResponseDto> {
    return await firstValueFrom(this.kafkaService.getClient().send('group-session.create', { userId }));
  }

  async join(
    joinGroupSessionDto: JoinGroupSessionDto,
    userId?: string,
  ): Promise<JoinGroupSessionResponseDto> {
    return await firstValueFrom(
      this.kafkaService.getClient().send('group-session.join', {
        ...joinGroupSessionDto,
        userId,
      }),
    );
  }

  async inviteFriend(sessionId: string, inviterId: string, friendId: string) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('group-session.invite-friend', {
        sessionId,
        inviterId,
        friendId,
      }),
    );
  }

  async close(sessionId: string, userId: string) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('group-session.close', { sessionId, userId }),
    );
  }

  async castVote(
    sessionId: string,
    placeId: string,
    userId?: string,
    guestId?: string,
  ) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('group-session.cast-vote', {
        sessionId,
        placeId,
        userId,
        guestId,
      }),
    );
  }

  async finalizeMemberVote(
    sessionId: string,
    userId?: string,
    guestId?: string,
  ) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('group-session.finalize-member-vote', {
        sessionId,
        userId,
        guestId,
      }),
    );
  }

  async finalizeSessionVote(sessionId: string, userId: string) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('group-session.finalize-session-vote', {
        sessionId,
        userId,
      }),
    );
  }

  async getVotes(sessionId: string) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('group-session.get-votes', { sessionId }),
    );
  }

  async getSession(sessionId: string) {
    return await firstValueFrom(
      this.kafkaService.getClient().send('group-session.get-session', { sessionId }),
    );
  }
}
