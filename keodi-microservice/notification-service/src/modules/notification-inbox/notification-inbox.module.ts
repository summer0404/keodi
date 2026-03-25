import { Module } from '@nestjs/common';
import { NotificationInboxController } from './notification-inbox.controller';
import { NotificationInboxService } from './notification-inbox.service';

@Module({
  controllers: [NotificationInboxController],
  providers: [NotificationInboxService],
})
export class NotificationInboxModule {}
