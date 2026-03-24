import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationDispatchController } from './notification.dispatch.controller';
import { NotificationDispatcherService } from './notification.dispatcher.service';
import { NotificationService } from './notification.service';
import { NotificationHelper } from './notification.helper';
import { ProviderModule } from 'src/providers/provider.module';

@Module({
  controllers: [NotificationController, NotificationDispatchController],
  providers: [NotificationService, NotificationDispatcherService, NotificationHelper],
})
export class NotificationModule {}
