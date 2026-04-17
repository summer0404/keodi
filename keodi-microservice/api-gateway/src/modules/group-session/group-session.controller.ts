import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { OptionalAuth } from 'src/common/decorators/optional-auth.decorator';
import { PaginationConstants } from 'src/shared/constants/pagination.constants';
import {
  AddCandidateDto,
  CastVoteDto,
  DeleteCandidateDto,
  FinalizeMemberVoteDto,
  GetAllSessionsQueryDto,
  GroupSessionResponseDto,
  InviteFriendToSessionDto,
  JoinGroupSessionDto,
  JoinGroupSessionResponseDto,
  LeaveSessionDto,
} from 'src/shared/dtos/group-session.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { GroupSessionService } from './group-session.service';
import {
  ApiAddCandidate,
  ApiCastVote,
  ApiCloseGroupSession,
  ApiCreateGroupSession,
  ApiDeleteCandidate,
  ApiFinalizeMemberVote,
  ApiFinalizeSessionVote,
  ApiGetAllSessions,
  ApiGetCandidates,
  ApiGetSession,
  ApiGetVotes,
  ApiInviteFriendToSession,
  ApiJoinGroupSession,
  ApiLeaveSession,
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

  @Post(':sessionId/vote')
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
  @ApiCastVote()
  async castVote(
    @CurrentUser() user: CurrentUserDto | undefined,
    @Param('sessionId') sessionId: string,
    @Body() castVoteDto: CastVoteDto,
  ) {
    return await this.groupSessionService.castVote(
      sessionId,
      castVoteDto.placeId,
      user?.id,
      castVoteDto.guestId,
    );
  }

  @Post(':sessionId/vote/finalize-member')
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
  @ApiFinalizeMemberVote()
  async finalizeMemberVote(
    @CurrentUser() user: CurrentUserDto | undefined,
    @Param('sessionId') sessionId: string,
    @Body() finalizeMemberVoteDto: FinalizeMemberVoteDto,
  ) {
    return await this.groupSessionService.finalizeMemberVote(
      sessionId,
      user?.id,
      finalizeMemberVoteDto.guestId,
    );
  }

  @Post(':sessionId/vote/finalize-session')
  @HttpCode(HttpStatus.OK)
  @ApiFinalizeSessionVote()
  async finalizeSessionVote(
    @CurrentUser() user: CurrentUserDto,
    @Param('sessionId') sessionId: string,
  ) {
    return await this.groupSessionService.finalizeSessionVote(
      sessionId,
      user.id,
    );
  }

  @Get(':sessionId')
  @OptionalAuth()
  @ApiGetSession()
  async getSession(@Param('sessionId') sessionId: string) {
    return await this.groupSessionService.getSession(sessionId);
  }

  @Get(':sessionId/votes')
  @ApiGetVotes()
  async getVotes(@Param('sessionId') sessionId: string) {
    return await this.groupSessionService.getVotes(sessionId);
  }

  @Get()
  @ApiGetAllSessions()
  async getAll(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetAllSessionsQueryDto,
  ) {
    return await this.groupSessionService.getAll(
      user.id,
      query.page || PaginationConstants.DEFAULT_PAGE,
      query.limit || PaginationConstants.DEFAULT_LIMIT,
    );
  }

  @Post(':sessionId/candidates')
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
  @ApiAddCandidate()
  async addCandidate(
    @CurrentUser() user: CurrentUserDto | undefined,
    @Param('sessionId') sessionId: string,
    @Body() addCandidateDto: AddCandidateDto,
  ) {
    return await this.groupSessionService.addCandidate(
      sessionId,
      addCandidateDto.placeId,
      user?.id,
      addCandidateDto.guestId,
    );
  }

  @Get(':sessionId/candidates')
  @OptionalAuth()
  @ApiGetCandidates()
  async getCandidates(@Param('sessionId') sessionId: string) {
    return await this.groupSessionService.getCandidates(sessionId);
  }

  @Delete(':sessionId/candidates/:placeId')
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
  @ApiDeleteCandidate()
  async deleteCandidate(
    @CurrentUser() user: CurrentUserDto | undefined,
    @Param('sessionId') sessionId: string,
    @Param('placeId') placeId: string,
    @Body() deleteCandidateDto: DeleteCandidateDto,
  ) {
    return await this.groupSessionService.deleteCandidate(
      sessionId,
      placeId,
      user?.id,
      deleteCandidateDto.guestId,
    );
  }

  @Post(':sessionId/leave')
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
  @ApiLeaveSession()
  async leaveSession(
    @CurrentUser() user: CurrentUserDto | undefined,
    @Param('sessionId') sessionId: string,
    @Body() leaveSessionDto: LeaveSessionDto,
  ) {
    return await this.groupSessionService.leaveSession(
      sessionId,
      user?.id,
      leaveSessionDto.guestId,
    );
  }
}
