import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GroupSessionResponseDto } from 'src/common/dtos/group-session.dto';

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

export const GroupSessionApiTags = () => {
  return applyDecorators(ApiTags('Group Sessions'));
};
