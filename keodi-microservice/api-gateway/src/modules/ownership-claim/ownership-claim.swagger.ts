import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CreateOwnershipClaimDto,
  OwnershipClaimActionResponseDto,
  PaginatedOwnershipClaimResponseDto,
  RejectOwnershipClaimDto,
} from 'src/shared/dtos/ownership-claim.dto';

export function ApiCreateOwnershipClaim() {
  return applyDecorators(
    ApiOperation({
      summary: 'Submit ownership claim',
      description: 'Submit a new ownership claim for a place.',
    }),
    ApiBody({ type: CreateOwnershipClaimDto }),
    ApiOkResponse({
      description: 'Ownership claim submitted successfully',
      type: OwnershipClaimActionResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid input' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiApproveOwnershipClaim() {
  return applyDecorators(
    ApiOperation({
      summary: 'Approve ownership claim',
      description: 'Approves an ownership claim, sets the owner of the place, and sends an approval email.',
    }),
    ApiOkResponse({
      description: 'Ownership claim approved successfully',
      type: OwnershipClaimActionResponseDto,
    }),
    ApiNotFoundResponse({ description: 'Ownership claim not found' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiRejectOwnershipClaim() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reject ownership claim',
      description: 'Rejects an ownership claim and sends a rejection email with the provided reason.',
    }),
    ApiBody({ type: RejectOwnershipClaimDto }),
    ApiOkResponse({
      description: 'Ownership claim rejected successfully',
      type: OwnershipClaimActionResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid rejection reason' }),
    ApiNotFoundResponse({ description: 'Ownership claim not found' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiGetOwnershipClaims() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get ownership claims',
      description: 'Retrieve a list of ownership claims with optional status filtering and pagination.',
    }),
    ApiOkResponse({
      description: 'Ownership claims retrieved successfully',
      type: PaginatedOwnershipClaimResponseDto,
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}