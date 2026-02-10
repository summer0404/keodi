import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GroupSessionResponseDto } from 'src/common/dtos/group-session.dto';

export const ApiCreateGroupSession = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a new group session',
      description:
        'Creates a new group study session for the authenticated user. The user will be automatically added as the creator and initial participant of the session.',
    }),
    ApiResponse({
      status: 201,
      description: 'Group session created successfully',
      type: GroupSessionResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing authentication token',
      schema: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'number',
            example: 401,
          },
          message: {
            type: 'string',
            example: 'Unauthorized',
          },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      schema: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'number',
            example: 500,
          },
          message: {
            type: 'string',
            example: 'Internal server error',
          },
        },
      },
    }),
  );
};

export const GroupSessionApiTags = () => {
  return applyDecorators(ApiTags('Group Sessions'));
};
