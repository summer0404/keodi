import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GroupSessionResponseDto } from 'src/common/dtos/group-session.dto';

@Injectable()
export class GroupSessionService {
  constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

  async createGroupSession(userId: string): Promise<GroupSessionResponseDto> {
    return firstValueFrom(
      this.client.send('group-session.create-group-session', { userId }),
    );
  }
}
