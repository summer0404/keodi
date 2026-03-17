import { Module } from '@nestjs/common';
import { EmailModule } from 'src/providers/email/email.module';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { KafkaModule } from 'src/providers/kafka/kafka.module';
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
  imports: [EmailModule, RedisModule, KafkaModule],
})
export class NotificationModule {}
