import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

export function ApiCreateReview() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a review',
      description: 'Create a review for a place by a user',
    }),
    ApiCreatedResponse({
      description: 'Review created successfully',
      schema: { example: { message: 'Review created successfully' } },
    }),
    ApiBadRequestResponse({ description: 'Invalid review data' }),
    ApiNotFoundResponse({ description: 'User or place not found' }),
  );
}

export function ApiGetOwnerReviews() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all reviews for my places',
      description: 'Owner-only. Returns all reviews across all owned places with optional filters.',
    }),
    ApiOkResponse({
      description: 'Paginated list of reviews',
      schema: {
        example: {
          reviews: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      },
    }),
  );
}

export function ApiRespondToReview() {
  return applyDecorators(
    ApiOperation({
      summary: 'Respond to a review',
      description: 'Owner-only. Add a public response to a review on your place. One response per review.',
    }),
    ApiCreatedResponse({
      description: 'Response added successfully',
      schema: { example: { message: 'Response added successfully' } },
    }),
    ApiNotFoundResponse({ description: 'Review not found' }),
    ApiForbiddenResponse({ description: 'Review does not belong to your place' }),
    ApiConflictResponse({ description: 'Review already has a response' }),
  );
}

export function ApiUpdateReviewResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update your response to a review',
      description: 'Owner-only. Edit an existing response. ownerResponseEditedAt will be updated.',
    }),
    ApiOkResponse({
      description: 'Response updated successfully',
      schema: { example: { message: 'Response updated successfully' } },
    }),
    ApiNotFoundResponse({ description: 'Review not found' }),
    ApiForbiddenResponse({ description: 'Review does not belong to your place' }),
    ApiConflictResponse({ description: 'No response exists to update' }),
  );
}

export function ApiDeleteReviewResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete your response to a review',
      description: 'Owner-only. Remove your existing response from a review.',
    }),
    ApiOkResponse({
      description: 'Response deleted successfully',
      schema: { example: { message: 'Response deleted successfully' } },
    }),
    ApiNotFoundResponse({ description: 'Review not found' }),
    ApiForbiddenResponse({ description: 'Review does not belong to your place' }),
    ApiConflictResponse({ description: 'No response exists to delete' }),
  );
}

export function ApiFlagReview() {
  return applyDecorators(
    ApiOperation({
      summary: 'Flag a review as inappropriate',
      description: 'Owner-only. Flag a review with a reason. Creates a pending flag for admin review. Does not immediately hide the review.',
    }),
    ApiCreatedResponse({
      description: 'Review flagged successfully',
      schema: { example: { message: 'Review flagged successfully' } },
    }),
    ApiNotFoundResponse({ description: 'Review not found' }),
    ApiForbiddenResponse({ description: 'Review does not belong to your place' }),
    ApiConflictResponse({ description: 'Review already has a pending or resolved flag' }),
  );
}

export function ApiApproveReviewFlags() {
  return applyDecorators(
    ApiOperation({
      summary: 'Approve flags on a review (admin)',
      description: 'Admin-only. Approves the pending flag, hides the review, and notifies the owner.',
    }),
    ApiOkResponse({
      description: 'Flag approved and review hidden',
      schema: { example: { message: 'Flag approved: review is now hidden' } },
    }),
    ApiNotFoundResponse({ description: 'Review not found' }),
    ApiConflictResponse({ description: 'No pending flag on this review' }),
  );
}

export function ApiRejectReviewFlags() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reject flags on a review (admin)',
      description: 'Admin-only. Rejects the pending flag, review stays visible, and notifies the owner.',
    }),
    ApiOkResponse({
      description: 'Flag rejected and review remains visible',
      schema: { example: { message: 'Flag rejected: review remains visible' } },
    }),
    ApiNotFoundResponse({ description: 'Review not found' }),
    ApiConflictResponse({ description: 'No pending flag on this review' }),
  );
}
