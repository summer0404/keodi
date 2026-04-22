import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNoContentResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpsertDeviceTokenDto } from 'src/shared/dtos/device-token.dto';

export function ApiUpsertDeviceToken() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create or update the authenticated user device token',
      description:
        'Upsert the authenticated user FCM token so push notifications can be sent to the current device.',
    }),
    ApiBody({ type: UpsertDeviceTokenDto }),
    ApiNoContentResponse({
      description: 'Device token queued for update successfully',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiBadRequestResponse({
      description: 'Invalid device token payload',
    }),
  );
}
