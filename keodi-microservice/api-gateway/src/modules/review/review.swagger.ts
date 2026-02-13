import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation
} from '@nestjs/swagger';

export function ApiCreateReview() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a review',
      description: 'Create a review for a place by a user',
    }),
    ApiCreatedResponse({
      description: 'Review created successfully',
      schema: {
        example: {
          message: 'Review created successfully',
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid review data',
    }),
    ApiNotFoundResponse({
      description: 'User or place not found',
    }),
  );
}
