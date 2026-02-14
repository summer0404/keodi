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
export class GroupSessionController {
  constructor(private readonly groupSessionService: GroupSessionService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiCreateGroupSession()
  async createGroupSession(
    @CurrentUser() user: CurrentUserDto,
  ): Promise<GroupSessionResponseDto> {
    return await this.groupSessionService.create(user.id);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @OptionalAuth() // allows both auth and guest
  @ApiBearerAuth('access-token')
  @ApiJoinGroupSession()
  async joinGroupSession(
    @CurrentUser() user: CurrentUserDto | undefined,
    @Body() dto: JoinGroupSessionDto,
  ): Promise<JoinGroupSessionResponseDto> {
    return await this.groupSessionService.join(
      dto.shareCode,
      user?.id, // undefined if guest
      dto.nickname,
      dto.guestId, // returning guest
    );
  }

  @Post(':sessionId/invite')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token') // auth required for invite
  @ApiInviteFriendToSession()
  async inviteFriend(
    @CurrentUser() user: CurrentUserDto,
    @Param('sessionId') sessionId: string,
    @Body() dto: InviteFriendToSessionDto,
  ) {
    return await this.groupSessionService.inviteFriend(
      sessionId,
      user.id,
      dto.friendId,
    );
  }

  @Post(':sessionId/close')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiCloseGroupSession()
  async closeGroupSession(
    @CurrentUser() user: CurrentUserDto,
    @Param('sessionId') sessionId: string,
  ): Promise<GroupSessionResponseDto> {
    return await this.groupSessionService.close(sessionId, user.id);
  }
}
