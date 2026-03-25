import { Module } from '@nestjs/common';
import { GroupSessionHelper } from 'src/shared/helpers/group-session.helper';
import { GroupSessionController } from './group-session.controller';
import { GroupSessionService } from './group-session.service';

@Module({
  controllers: [GroupSessionController],
  providers: [GroupSessionService, GroupSessionHelper],
})
export class GroupSessionModule {}
