import { Module } from '@nestjs/common';
import { ImageModule } from '../image/image.module';
import { GroupSessionController } from './group-session.controller';
import { GroupSessionScheduler } from './group-session.scheduler';
import { GroupSessionService } from './group-session.service';
import { GroupSessionHelper } from './group-session.helper';

@Module({
  imports: [ImageModule],
  controllers: [GroupSessionController],
  providers: [GroupSessionService, GroupSessionHelper, GroupSessionScheduler],
})
export class GroupSessionModule { }
