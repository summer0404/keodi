import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  GetFriendsQueryDto,
  GetPendingRequestsQueryDto,
  SendFriendRequestDto,
} from 'src/common/dtos/friend.dto';
import { CurrentUserDto } from 'src/common/dtos/user.dto';
import { FriendService } from './friend.service';

@ApiTags('Friends')
@Controller('friends')
@ApiBearerAuth('access-token')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  @ApiOperation({
    summary: 'Send a friend request',
    description: 'Send a friend request to another user by their ID',
  })
  @ApiResponse({
    status: 201,
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
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot send friend request to yourself',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Already friends or friend request already exists',
  })
  async sendRequest(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendService.sendRequest(user.id, dto.receiverId);
  }

  @Post('request/:requestId/accept')
  @ApiOperation({
    summary: 'Accept a friend request',
    description: 'Accept a pending friend request that you received',
  })
  @ApiParam({
    name: 'requestId',
    description: 'ID of the friend request to accept',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  @ApiResponse({
    status: 201,
    description: 'Friend request accepted successfully',
    schema: {
      example: {
        success: true,
        message: 'Friend request accepted',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to accept this request',
  })
  @ApiResponse({
    status: 404,
    description: 'Friend request not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Request is no longer valid',
  })
  async acceptRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.acceptRequest(user.id, requestId);
  }

  @Post('request/:requestId/reject')
  @ApiOperation({
    summary: 'Reject a friend request',
    description: 'Reject a pending friend request that you received',
  })
  @ApiParam({
    name: 'requestId',
    description: 'ID of the friend request to reject',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  @ApiResponse({
    status: 201,
    description: 'Friend request rejected successfully',
    schema: {
      example: {
        success: true,
        message: 'Friend request rejected',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to reject this request',
  })
  @ApiResponse({
    status: 404,
    description: 'Friend request not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Request is no longer valid',
  })
  async rejectRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.rejectRequest(user.id, requestId);
  }

  @Post('request/:requestId/cancel')
  @ApiOperation({
    summary: 'Cancel a friend request',
    description: 'Cancel a pending friend request that you sent',
  })
  @ApiParam({
    name: 'requestId',
    description: 'ID of the friend request to cancel',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  @ApiResponse({
    status: 201,
    description: 'Friend request cancelled successfully',
    schema: {
      example: {
        success: true,
        message: 'Friend request cancelled',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to cancel this request',
  })
  @ApiResponse({
    status: 404,
    description: 'Friend request not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Request is no longer valid',
  })
  async cancelRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.cancelRequest(user.id, requestId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get friends list',
    description: 'Get paginated list of friends with sorting options',
  })
  @ApiResponse({
    status: 200,
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
  })
  async getFriends(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetFriendsQueryDto,
  ) {
    return this.friendService.getFriends(user.id, query);
  }

  @Get('requests/pending')
  @ApiOperation({
    summary: 'Get pending friend requests',
    description:
      'Get paginated list of pending friend requests you received with sorting options',
  })
  @ApiResponse({
    status: 200,
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
  })
  async getPendingRequests(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetPendingRequestsQueryDto,
  ) {
    return this.friendService.getPendingRequests(user.id, query);
  }

  @Delete(':friendId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a friend',
    description: 'Remove a user from your friends list',
  })
  @ApiParam({
    name: 'friendId',
    description: 'ID of the friend to remove',
    example: 'cm5j9k0l1m2n3o4p5q6r',
  })
  @ApiResponse({
    status: 200,
    description: 'Friend removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Friend removed successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Friendship not found',
  })
  async removeFriend(
    @CurrentUser() user: CurrentUserDto,
    @Param('friendId') friendId: string,
  ) {
    return this.friendService.removeFriend(user.id, friendId);
  }
}
