import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          const brokers = (config.get<string>('KAFKA_BROKER') || '').split(',');
          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'notification-producer',
                brokers,
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
  exports: [ClientsModule, KafkaService],
})
export class KafkaModule {}
