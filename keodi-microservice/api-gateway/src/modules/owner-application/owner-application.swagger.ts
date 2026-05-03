import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  OwnerApplicationActionResponseDto,
  PaginatedOwnerApplicationResponseDto,
  RejectOwnerApplicationDto,
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
