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
          id: 'cm5g8h9j0k1l2m3n4o5p',
          userId: 'cm5a1b2c3d4e5f6g7h8i',
          placeId: 'cm5j9k0l1m2n3o4p5q6r',
          reviewerName: 'Nguyen Van A',
          reviewerPicture: 'user_images/cm5a1b2c3d4e5f6g7h8i.jpg',
          fromGoogle: false,
          originalLanguage: 'vi',
          rating: 4,
          text: 'Great place with excellent service!',
          createdAt: '2026-02-07T10:30:00Z',
          updatedAt: '2026-02-07T10:30:00Z',
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
