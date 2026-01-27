import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { EmailModule } from 'src/providers/email/email.module';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
  ],
  imports: [EmailModule],
})
export class NotificationModule {}
