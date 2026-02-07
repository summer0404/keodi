import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  GetFriendsQueryDto,
  SendFriendRequestDto,
} from 'src/common/dtos/friend.dto';
import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';
import { CurrentUserDto } from 'src/common/dtos/user.dto';
import { FriendService } from './friend.service';

@Controller('friends')
@ApiBearerAuth('access-token')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  async sendRequest(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendService.sendRequest(user.id, dto.receiverId);
  }

  @Post('request/:requestId/accept')
  async acceptRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.acceptRequest(user.id, requestId);
  }

  @Post('request/:requestId/reject')
  async rejectRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.rejectRequest(user.id, requestId);
  }

  @Post('request/:requestId/cancel')
  async cancelRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.cancelRequest(user.id, requestId);
  }

  @Get()
  async getFriends(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetFriendsQueryDto,
  ) {
    return this.friendService.getFriends(user.id, query);
  }

  @Get('requests/pending')
  async getPendingRequests(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: PaginationQueryDto,
  ) {
    return this.friendService.getPendingRequests(user.id, query);
  }

  @Delete(':friendId')
  async removeFriend(
    @CurrentUser() user: CurrentUserDto,
    @Param('friendId') friendId: string,
  ) {
    return this.friendService.removeFriend(user.id, friendId);
  }
}
