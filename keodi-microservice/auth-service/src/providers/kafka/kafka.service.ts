import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { KAFKA_TIMEOUT_MS } from 'src/shared/constants/kafka.constant';
import { UserTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class KafkaService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) { }

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf(UserTopics.UsernameSynced);
    this.kafkaClient.subscribeToResponseOf(UserTopics.Create);
    await this.kafkaClient.connect();
  }

  getClient(): ClientKafka {
    return this.kafkaClient;
  }

  sendWithTimeout(topic: string, data: unknown, timeoutMs: number = KAFKA_TIMEOUT_MS) {
    return firstValueFrom(
      this.kafkaClient.send(topic, data).pipe(timeout(timeoutMs)),
    );
  }
}
