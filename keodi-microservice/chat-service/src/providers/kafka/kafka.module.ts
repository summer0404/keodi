import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        inject: [ConfigService],
        useFactory: async (config: ConfigService) => {
          const brokersString = config.get<string>('KAFKA_BROKER');
          const brokers = brokersString ? brokersString.split(',') : [];
          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'chat-client',
                brokers,
              },
              consumer: {
                groupId: 'chat-consumer',
                allowAutoTopicCreation: true,
              },
              subscribe: {
                fromBeginning: false,
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
