import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from 'src/providers/email/email.module';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { PresenceService } from 'src/providers/presence/presence.service';
import { RedisModule } from 'src/providers/redis/redis.module';
import { NotificationController } from './notification.controller';
import { NotificationDispatchController } from './notification.dispatch.controller';
import { NotificationDispatcherService } from './notification.dispatcher.service';
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationController, NotificationDispatchController],
  providers: [
    NotificationService,
    NotificationDispatcherService,
    FcmService,
    PresenceService,
  ],
  imports: [
    EmailModule,
    RedisModule,
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'notification-producer',
              brokers: (config.get<string>('KAFKA_BROKER') || '').split(','),
            },
          },
        }),
      },
    ]),
  ],
})
export class NotificationModule {}
