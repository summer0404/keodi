import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';

export function ApiSendFriendRequest() {
  return applyDecorators(
    ApiOperation({
      summary: 'Send a friend request',
      description: 'Send a friend request to another user by their ID',
    }),
    ApiCreatedResponse({
      description: 'Friend request sent successfully',
      schema: {
        example: {
          id: 'cm5g8h9j0k1l2m3n4o5p',
          senderId: 'cm5a1b2c3d4e5f6g7h8i',
          receiverId: 'cm5j9k0l1m2n3o4p5q6r',
          status: 'PENDING',
          createdAt: '2026-02-07T10:30:00Z',
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Cannot send friend request to yourself',
    }),
    ApiNotFoundResponse({
      description: 'User not found',
    }),
    ApiConflictResponse({
      description: 'Already friends or friend request already exists',
    }),
  );
}

export function ApiAcceptFriendRequest() {
  return applyDecorators(
    ApiOperation({
      summary: 'Accept a friend request',
      description: 'Accept a pending friend request that you received',
    }),
    ApiParam({
      name: 'requestId',
      description: 'ID of the friend request to accept',
      example: 'cm5g8h9j0k1l2m3n4o5p',
    }),
    ApiCreatedResponse({
      description: 'Friend request accepted successfully',
      schema: {
        example: {
          success: true,
          message: 'Friend request accepted',
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Not authorized to accept this request',
    }),
    ApiNotFoundResponse({
      description: 'Friend request not found',
    }),
    ApiBadRequestResponse({
      description: 'Request is no longer valid',
    }),
  );
}

export function ApiRejectFriendRequest() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reject a friend request',
      description: 'Reject a pending friend request that you received',
    }),
    ApiParam({
      name: 'requestId',
      description: 'ID of the friend request to reject',
      example: 'cm5g8h9j0k1l2m3n4o5p',
    }),
    ApiCreatedResponse({
      description: 'Friend request rejected successfully',
      schema: {
        example: {
          success: true,
          message: 'Friend request rejected',
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Not authorized to reject this request',
    }),
    ApiNotFoundResponse({
      description: 'Friend request not found',
    }),
    ApiBadRequestResponse({
      description: 'Request is no longer valid',
    }),
  );
}

export function ApiCancelFriendRequest() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cancel a friend request',
      description: 'Cancel a pending friend request that you sent',
    }),
    ApiParam({
      name: 'requestId',
      description: 'ID of the friend request to cancel',
      example: 'cm5g8h9j0k1l2m3n4o5p',
    }),
    ApiCreatedResponse({
      description: 'Friend request cancelled successfully',
      schema: {
        example: {
          success: true,
          message: 'Friend request cancelled',
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Not authorized to cancel this request',
    }),
    ApiNotFoundResponse({
      description: 'Friend request not found',
    }),
    ApiBadRequestResponse({
      description: 'Request is no longer valid',
    }),
  );
}

export function ApiGetFriendsList() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get friends list',
      description: 'Get paginated list of friends with sorting options',
    }),
    ApiOkResponse({
      description: 'Friends list retrieved successfully',
      schema: {
        example: {
          friends: [
            {
              id: 'cm5g8h9j0k1l2m3n4o5p',
              userId: 'cm5a1b2c3d4e5f6g7h8i',
              friendId: 'cm5j9k0l1m2n3o4p5q6r',
              createdAt: '2026-02-07T10:30:00Z',
              friend: {
                id: 'cm5j9k0l1m2n3o4p5q6r',
                firstName: 'John',
                lastName: 'Doe',
                pictureUrl: 'https://example.com/avatar.jpg',
              },
            },
          ],
          total: 10,
          page: 1,
          totalPages: 1,
          limit: 10,
        },
      },
    }),
  );
}

export function ApiGetPendingFriendRequests() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get pending friend requests',
      description:
        'Get paginated list of pending friend requests you received with sorting options',
    }),
    ApiOkResponse({
      description: 'Pending requests retrieved successfully',
      schema: {
        example: {
          requests: [
            {
              id: 'cm5g8h9j0k1l2m3n4o5p',
              senderId: 'cm5a1b2c3d4e5f6g7h8i',
              receiverId: 'cm5j9k0l1m2n3o4p5q6r',
              status: 'PENDING',
              createdAt: '2026-02-07T10:30:00Z',
              sender: {
                id: 'cm5a1b2c3d4e5f6g7h8i',
                firstName: 'Jane',
                lastName: 'Smith',
                pictureUrl: 'https://example.com/avatar2.jpg',
              },
            },
          ],
          total: 5,
          page: 1,
          totalPages: 1,
          limit: 10,
        },
      },
    }),
  );
}

export function ApiRemoveFriend() {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove a friend',
      description: 'Remove a user from your friends list',
    }),
    ApiParam({
      name: 'friendId',
      description: 'ID of the friend to remove',
      example: 'cm5j9k0l1m2n3o4p5q6r',
    }),
    ApiOkResponse({
      description: 'Friend removed successfully',
      schema: {
        example: {
          success: true,
          message: 'Friend removed successfully',
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Friendship not found',
    }),
  );
}
