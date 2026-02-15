import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { OptionalAuth } from 'src/common/decorators/optional-auth.decorator';
import {
  GroupSessionResponseDto,
  InviteFriendToSessionDto,
  JoinGroupSessionDto,
  JoinGroupSessionResponseDto,
} from 'src/common/dtos/group-session.dto';
import { CurrentUserDto } from 'src/common/dtos/user.dto';
import { GroupSessionService } from './group-session.service';
import {
  ApiCloseGroupSession,
  ApiCreateGroupSession,
  ApiInviteFriendToSession,
  ApiJoinGroupSession,
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

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @OptionalAuth() // allows both auth and guest
  @ApiJoinGroupSession()
  async joinGroupSession(
    @CurrentUser() user: CurrentUserDto | undefined,
    @Body() joinGroupSessionDto: JoinGroupSessionDto,
  ): Promise<JoinGroupSessionResponseDto> {
    return await this.groupSessionService.join(joinGroupSessionDto, user?.id);
  }

  @Post(':sessionId/invite')
  @HttpCode(HttpStatus.OK)
  @ApiInviteFriendToSession()
  async inviteFriend(
    @CurrentUser() user: CurrentUserDto,
    @Param('sessionId') sessionId: string,
    @Body() inviteFriendToSessionDto: InviteFriendToSessionDto,
  ) {
    return await this.groupSessionService.inviteFriend(
      sessionId,
      user.id,
      inviteFriendToSessionDto.friendId,
    );
  }

  @Post(':sessionId/close')
  @HttpCode(HttpStatus.OK)
  @ApiCloseGroupSession()
  async closeGroupSession(
    @CurrentUser() user: CurrentUserDto,
    @Param('sessionId') sessionId: string,
  ): Promise<GroupSessionResponseDto> {
    return await this.groupSessionService.close(sessionId, user.id);
  }
}
