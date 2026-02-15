import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiTags,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import {
  GroupSessionResponseDto,
  JoinGroupSessionResponseDto,
} from 'src/common/dtos/group-session.dto';

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

export const GroupSessionApiTags = () => {
  return applyDecorators(ApiTags('Group Sessions'));
};
