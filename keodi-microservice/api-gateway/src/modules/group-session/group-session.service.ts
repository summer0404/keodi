import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GroupSessionService {
  constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

  async createGroupSession(userId: string) {
    return firstValueFrom(
      this.client.send('group-session.create-group-session', { userId }),
    );
  }
}
