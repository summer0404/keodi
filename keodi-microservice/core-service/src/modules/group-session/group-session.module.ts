import { Module } from '@nestjs/common';
import { GroupSessionHelper } from 'src/shared/helpers/group-session.helper';
import { GroupSessionController } from './group-session.controller';
import { GroupSessionScheduler } from './group-session.scheduler';
import { GroupSessionService } from './group-session.service';

@Module({
  controllers: [GroupSessionController],
  providers: [GroupSessionService, GroupSessionHelper, GroupSessionScheduler],
})
export class GroupSessionModule {}
