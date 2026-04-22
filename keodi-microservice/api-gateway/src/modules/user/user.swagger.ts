import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CategoryOnboardingDto } from 'src/shared/dtos/category.dto';
import {
  OtherUserProfileResponseDto,
  SearchUsersResponseDto,
  UpdateLocationDto,
  UpdateUsernameDto,
  UpdateUserProfileDto,
  UserBasicResponseDto,
  UserMessageResponseDto,
} from 'src/shared/dtos/user.dto';

export function ApiGetAllUsers() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all users',
      description: 'Get all users (testing endpoint).',
    }),
    ApiOkResponse({
      description: 'Return list of all users with their IDs',
      type: [UserBasicResponseDto],
    }),
  );
}

export function ApiGetOtherProfile() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get another user profile',
      description:
        'Get another user profile with privacy filtering based on profile visibility and relationship status.',
    }),
    ApiParam({
      name: 'userId',
      description: 'Target user ID',
      example: 'clq2k3s9f000001l6gms61932',
    }),
    ApiOkResponse({
      description:
        'Return profile data with friendship status and flags for invite behavior.',
      type: OtherUserProfileResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'USER_NOT_FOUND',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}

export function ApiSearchUsers() {
  return applyDecorators(
    ApiOperation({
      summary: 'Search other users',
      description:
        'Search users by username, first name, or last name. The current authenticated user is excluded from results.',
    }),
    ApiQuery({ name: 'keyword', required: true, type: String }),
    ApiOkResponse({
      description: 'Paginated list of matched users',
      type: SearchUsersResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}

export function ApiUnverifyUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Unverify user',
      description: 'Mark a user as unverified account (testing endpoint).',
    }),
    ApiParam({
      name: 'userId',
      description: 'User ID to unverify',
      example: 'clq2k3s9f000001l6gms61932',
    }),
    ApiOkResponse({
      description: 'Return message inform that unverify user successfully',
      type: UserMessageResponseDto,
    }),
  );
}

export function ApiUpdateUsername() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update username',
      description: 'Update username of the current authenticated user.',
    }),
    ApiBody({ type: UpdateUsernameDto }),
    ApiOkResponse({
      description: 'Return message inform that update username successfully',
      type: UserMessageResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid username provided' }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}

export function ApiUpdatePicture() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update profile picture',
      description: 'Update profile picture of the current authenticated user.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          picture: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
    ApiOkResponse({
      description:
        'Return message inform that update profile picture successfully',
      type: UserMessageResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid image file provided' }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}

export function ApiUpdateProfile() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update profile',
      description: 'Update profile fields of the current authenticated user.',
    }),
    ApiBody({ type: UpdateUserProfileDto }),
    ApiOkResponse({
      description: 'Return message inform that update profile successfully',
      type: UserMessageResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid profile data provided' }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}

export function ApiOnBoarding() {
  return applyDecorators(
    ApiOperation({
      summary: 'Onboarding user',
      description: 'Onboard user with selected categories.',
    }),
    ApiBody({ type: CategoryOnboardingDto }),
    ApiOkResponse({
      description: 'Return message inform that onboarding user successfully',
      type: UserMessageResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid category IDs provided' }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}

export function ApiUpdateLocation() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update user location',
      description: 'Update user current location for background notifications.',
    }),
    ApiBody({ type: UpdateLocationDto }),
    ApiOkResponse({
      description: 'Location updated',
      type: UserMessageResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid latitude or longitude' }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}
