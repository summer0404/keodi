import { Module } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { GroupSessionHelper } from 'src/shared/helpers/group-session.helper';
import { GroupSessionController } from './group-session.controller';
import { GroupSessionService } from './group-session.service';

@Module({
  imports: [],
  controllers: [GroupSessionController],
  providers: [GroupSessionService, GroupSessionHelper, KafkaService],
})
export class GroupSessionModule {}
