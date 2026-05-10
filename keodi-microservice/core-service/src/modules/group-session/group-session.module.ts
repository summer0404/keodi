import { Module } from '@nestjs/common';
import { ImageModule } from '../image/image.module';
import { ConversationModule } from '../conversation/conversation.module';
import { GroupSessionController } from './group-session.controller';
import { GroupSessionHelper } from './group-session.helper';
import { GroupSessionScheduler } from './group-session.scheduler';
import { GroupSessionService } from './group-session.service';

@Module({
  imports: [ImageModule, ConversationModule],
  controllers: [GroupSessionController],
  providers: [GroupSessionService, GroupSessionHelper, GroupSessionScheduler],
})
export class GroupSessionModule {}
