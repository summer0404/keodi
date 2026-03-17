import { Module } from '@nestjs/common';
import { NotificationRealtimeController } from './notification-realtime.controller';
import { NotificationGateway } from './notification.gateway';
import { RedisModule } from 'src/providers/redis/redis.module';

@Module({
  controllers: [NotificationRealtimeController],
  providers: [NotificationGateway],
  imports: [RedisModule],
})
export class NotificationRealtimeModule {}
