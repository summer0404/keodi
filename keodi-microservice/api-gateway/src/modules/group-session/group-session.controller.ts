import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GroupSessionService } from './group-session.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/common/dtos/user.dto';

@Controller('group-sessions')
@ApiBearerAuth('access-token')
export class GroupSessionController {
  constructor(private readonly groupSessionService: GroupSessionService) {}

  @Post()
  async createGroupSession(@CurrentUser() user: CurrentUserDto) {
    return await this.groupSessionService.createGroupSession(user.id);
  }
}
