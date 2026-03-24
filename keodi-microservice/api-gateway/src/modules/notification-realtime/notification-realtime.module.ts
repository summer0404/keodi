import { Module } from '@nestjs/common';
import { NotificationRealtimeController } from './notification-realtime.controller';
import { NotificationGateway } from './notification.gateway';

@Module({
  controllers: [NotificationRealtimeController],
  providers: [NotificationGateway],
})
export class NotificationRealtimeModule {}
