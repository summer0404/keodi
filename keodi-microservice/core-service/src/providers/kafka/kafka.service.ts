import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { KAFKA_TIMEOUT_MS } from 'src/shared/constants/kafka.constant';
import { AuthTopics, IntelligenceTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class KafkaService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf(IntelligenceTopics.ExtractUserIntent);
    this.kafkaClient.subscribeToResponseOf(IntelligenceTopics.Ranking);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.ApproveOwner);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.RejectOwner);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.ResubmitOwner);

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
