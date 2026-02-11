import { Module } from '@nestjs/common';
import { GroupSessionController } from './group-session.controller';
import { GroupSessionService } from './group-session.service';

@Module({
  imports: [],
  controllers: [GroupSessionController],
  providers: [GroupSessionService],
})
export class GroupSessionModule {}
