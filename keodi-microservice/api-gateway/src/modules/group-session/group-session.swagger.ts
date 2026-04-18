import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  PaginatedGetAllSessionsResponseDto,
  GroupSessionResponseDto,
  JoinGroupSessionResponseDto,
} from 'src/shared/dtos/group-session.dto';

export const ApiCreateGroupSession = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a new group session',
      description:
        'Creates a new group study session for the authenticated user. The user will be automatically added as the creator and initial participant of the session.',
    }),
    ApiCreatedResponse({
      description: 'Group session created successfully',
      type: GroupSessionResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
    }),
  );
};

export const ApiJoinGroupSession = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Join a group session',
      description:
        'Join an existing group session via share code. Works for both authenticated and anonymous users.',
    }),
    ApiOkResponse({
      description: 'Joined successfully',
      type: JoinGroupSessionResponseDto,
    }),
    ApiNotFoundResponse({ description: 'Session not found' }),
    ApiBadRequestResponse({ description: 'Session is no longer active' }),
  );
};

export const ApiInviteFriendToSession = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Invite a friend to a session',
      description:
        'Send an in-app invite to a friend to join your group session. Requires authentication.',
    }),
    ApiOkResponse({ description: 'Invite sent successfully' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Not a member of this session' }),
    ApiConflictResponse({ description: 'Friend already in session' }),
  );
};

export const ApiCloseGroupSession = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Close a group session',
      description:
        'Closes an active group session. Only the session creator can close the session.',
    }),
    ApiOkResponse({
      description: 'Session closed successfully',
      type: GroupSessionResponseDto,
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({
      description: 'Only the creator can close the session',
    }),
    ApiNotFoundResponse({ description: 'Session not found' }),
    ApiBadRequestResponse({ description: 'Session is already closed' }),
  );
};

export const ApiCastVote = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Cast a vote for a place',
      description:
        'Cast or update a vote for a place in a group session. A member can change their vote until it is finalized.',
    }),
    ApiOkResponse({ description: 'Vote cast successfully' }),
    ApiNotFoundResponse({ description: 'Session or place not found' }),
    ApiBadRequestResponse({
      description: 'Session not active or vote already finalized',
    }),
    ApiForbiddenResponse({ description: 'Not a member of this session' }),
  );
};

export const ApiFinalizeMemberVote = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Finalize your vote',
      description:
        'Lock in your vote so it can no longer be changed. If all members have finalized, the session vote is auto-finalized.',
    }),
    ApiOkResponse({ description: 'Vote finalized successfully' }),
    ApiBadRequestResponse({
      description: 'No vote cast yet or vote already finalized',
    }),
    ApiForbiddenResponse({ description: 'Not a member of this session' }),
  );
};

export const ApiFinalizeSessionVote = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Finalize session voting',
      description:
        'Force-finalize all votes in the session. Only the session creator can perform this action.',
    }),
    ApiOkResponse({ description: 'Session vote finalized successfully' }),
    ApiForbiddenResponse({ description: 'Only the creator can finalize' }),
    ApiBadRequestResponse({
      description: 'Session not active or voting already finalized',
    }),
  );
};

export const ApiGetVotes = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get session votes',
      description:
        'Retrieve all votes and aggregated results for a group session.',
    }),
    ApiOkResponse({ description: 'Votes retrieved successfully' }),
    ApiNotFoundResponse({ description: 'Session not found' }),
  );
};

export const ApiGetSession = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get session details',
      description:
        'Retrieve the full state of a group session including members, status, vote status, winning place, and finalization time.',
    }),
    ApiOkResponse({ description: 'Session retrieved successfully' }),
    ApiNotFoundResponse({ description: 'Session not found' }),
  );
};

export const ApiGetAllSessions = (): MethodDecorator => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all sessions of current user',
      description:
        'Retrieve a paginated list of group sessions where the authenticated user is a participant. Each item includes a memberCount (true total) and up to 4 member previews with resolved picture URLs for avatar display.',
    }),
    ApiOkResponse({
      description: 'User sessions retrieved successfully',
      type: PaginatedGetAllSessionsResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  ) as MethodDecorator;
};

export const ApiAddCandidate = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Add a place as a candidate',
      description:
        'Add a place to the candidate pool for a group session. If the place is already a candidate, the request silently succeeds.',
    }),
    ApiOkResponse({ description: 'Candidate added successfully' }),
    ApiNotFoundResponse({ description: 'Session or place not found' }),
    ApiBadRequestResponse({ description: 'Session is not active' }),
    ApiForbiddenResponse({ description: 'Not a member of this session' }),
  );
};

export const ApiGetCandidates = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get candidate places for a session',
      description:
        'Retrieve all places that have been added to the candidate pool for a group session.',
    }),
    ApiOkResponse({ description: 'Candidates retrieved successfully' }),
    ApiNotFoundResponse({ description: 'Session not found' }),
  );
};

export const ApiDeleteCandidate = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove a candidate place from a session',
      description:
        'Remove a place from the candidate pool. Only the member who added the candidate can remove it.',
    }),
    ApiOkResponse({ description: 'Candidate removed successfully' }),
    ApiNotFoundResponse({ description: 'Session or candidate not found' }),
    ApiBadRequestResponse({ description: 'Session is not active' }),
    ApiForbiddenResponse({ description: 'Not a member or not the candidate owner', }),
  );
};

export const ApiLeaveSession = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Leave a group session',
      description:
        'Remove yourself from a group session. The session creator cannot leave; they must close the session instead.',
    }),
    ApiOkResponse({ description: 'Left session successfully' }),
    ApiNotFoundResponse({ description: 'Session or member not found' }),
    ApiBadRequestResponse({ description: 'Session is not active' }),
    ApiForbiddenResponse({ description: 'Session creator cannot leave the session' }),
  );
};

export const GroupSessionApiTags = () => {
  return applyDecorators(ApiTags('Group Sessions'));
};
