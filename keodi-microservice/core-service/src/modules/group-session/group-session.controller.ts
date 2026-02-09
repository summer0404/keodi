import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GroupSessionService } from './group-session.service';

@Controller('group-session')
export class GroupSessionController {
  constructor(private readonly groupSessionService: GroupSessionService) {}

  @MessagePattern('group-session.create-group-session')
  async createGroupSession(@Payload() data: { userId: string }) {
    return this.groupSessionService.createGroupSession(data.userId);
  }
}
