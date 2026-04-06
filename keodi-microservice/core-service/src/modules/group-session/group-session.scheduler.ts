import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GroupSessionService } from './group-session.service';

@Injectable()
export class GroupSessionScheduler {
  private readonly logger = new Logger(GroupSessionScheduler.name);

  constructor(private readonly groupSessionService: GroupSessionService) {}

  @Cron('*/1 * * * *')
  async autoCloseExpiredSessions() {
    const { count } = await this.groupSessionService.autoCloseExpiredSessions();

    if (count > 0) {
      this.logger.log(`Auto-closed ${count} expired finalized session(s)`);
    }
  }
}
