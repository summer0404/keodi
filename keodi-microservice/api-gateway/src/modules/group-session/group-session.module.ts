import { Module } from '@nestjs/common';
import { GroupSessionController } from './group-session.controller';
import { GroupSessionService } from './group-session.service';

@Module({
  controllers: [GroupSessionController],
  providers: [GroupSessionService],
})
export class GroupSessionModule {}
