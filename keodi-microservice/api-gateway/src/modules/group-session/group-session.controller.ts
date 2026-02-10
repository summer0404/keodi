import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GroupSessionResponseDto } from 'src/common/dtos/group-session.dto';
import { CurrentUserDto } from 'src/common/dtos/user.dto';
import { GroupSessionService } from './group-session.service';
import {
  ApiCreateGroupSession,
  GroupSessionApiTags,
} from './group-session.swagger';

@Controller('group-sessions')
@GroupSessionApiTags()
@ApiBearerAuth('access-token')
export class GroupSessionController {
  constructor(private readonly groupSessionService: GroupSessionService) {}

  @Post()
  @ApiCreateGroupSession()
  async createGroupSession(
    @CurrentUser() user: CurrentUserDto,
  ): Promise<GroupSessionResponseDto> {
    return await this.groupSessionService.create(user.id);
  }
}
