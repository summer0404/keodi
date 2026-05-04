import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  OwnerApplicationActionResponseDto,
  PaginatedOwnerApplicationResponseDto,
  RejectOwnerApplicationDto,
  ResubmitOwnerApplicationDto,
} from 'src/shared/dtos/owner-application.dto';

export function ApiGetOwnerApplications() {
  return applyDecorators(
    ApiOperation({
      summary: 'List owner applications',
      description:
        'Retrieve all owner registration applications with optional status filtering and pagination.',
    }),
    ApiOkResponse({
      description: 'Owner applications retrieved successfully',
      type: PaginatedOwnerApplicationResponseDto,
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiApproveOwnerApplication() {
  return applyDecorators(
    ApiOperation({
      summary: 'Approve owner application',
      description:
        'Approves an owner application, promotes the applicant role to OWNER, and sends an approval email.',
    }),
    ApiOkResponse({
      description: 'Owner application approved successfully',
      type: OwnerApplicationActionResponseDto,
    }),
    ApiNotFoundResponse({ description: 'Owner application not found' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiRejectOwnerApplication() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reject owner application',
      description:
        'Rejects an owner application and sends a rejection email with the provided reason.',
    }),
    ApiBody({ type: RejectOwnerApplicationDto }),
    ApiOkResponse({
      description: 'Owner application rejected successfully',
      type: OwnerApplicationActionResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid rejection reason' }),
    ApiNotFoundResponse({ description: 'Owner application not found' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiResubmitOwnerApplication() {
  return applyDecorators(
    ApiOperation({
      summary: 'Resubmit rejected owner application',
      description:
        'Allows a user whose owner application was rejected to update their business information and resubmit for review. Resets the application status to PENDING and the user role to OWNER_PENDING.',
    }),
    ApiBody({ type: ResubmitOwnerApplicationDto }),
    ApiOkResponse({
      description: 'Owner application resubmitted successfully',
      type: OwnerApplicationActionResponseDto,
    }),
    ApiConflictResponse({ description: 'Application is not in REJECTED status' }),
    ApiNotFoundResponse({ description: 'Owner application not found' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
