import { applyDecorators } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiOkResponse,
    ApiOperation,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserSettingsDto } from 'src/shared/dtos/setting.dto';

export function ApiGetSettings() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get user settings',
      description:
        'Retrieve the current authenticated user settings. Returns default values for any setting not yet configured.',
    }),
    ApiOkResponse({
      description: 'User settings retrieved successfully',
      type: UserSettingsDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}

export function ApiUpdateSettings() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update user settings',
      description:
        'Partially update user settings. Only send the fields you want to change — all fields are optional.',
    }),
    ApiOkResponse({
      description: 'User settings updated successfully',
      type: UserSettingsDto,
    }),
    ApiBadRequestResponse({
      description: 'Invalid setting value provided',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}
