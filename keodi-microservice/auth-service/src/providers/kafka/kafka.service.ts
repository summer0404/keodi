import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { UserTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class KafkaService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf(UserTopics.UsernameSynced);
    this.kafkaClient.subscribeToResponseOf(UserTopics.Create);
    await this.kafkaClient.connect();
  }

  getClient(): ClientKafka {
    return this.kafkaClient;
  }
}
