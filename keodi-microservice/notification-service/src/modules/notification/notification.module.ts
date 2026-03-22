import { Module } from '@nestjs/common';
import { ProvidersModule } from 'src/providers/providers.module';
import { NotificationController } from './notification.controller';
import { NotificationDispatchController } from './notification.dispatch.controller';
import { NotificationDispatcherService } from './notification.dispatcher.service';
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationController, NotificationDispatchController],
  providers: [NotificationService, NotificationDispatcherService],
  imports: [ProvidersModule],
})
export class NotificationModule {}
