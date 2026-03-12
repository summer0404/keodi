import { Module } from '@nestjs/common';
import { GroupSessionHelper } from 'src/common/helpers/group-session.helper';
import { GroupSessionController } from './group-session.controller';
import { GroupSessionService } from './group-session.service';

@Module({
  imports: [],
  controllers: [GroupSessionController],
  providers: [GroupSessionService, GroupSessionHelper],
})
export class GroupSessionModule {}
