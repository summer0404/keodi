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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  GetFriendsQueryDto,
  GetPendingRequestsQueryDto,
  SendFriendRequestDto,
} from 'src/shared/dtos/friend.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { FriendService } from './friend.service';
import {
  ApiAcceptFriendRequest,
  ApiCancelFriendRequest,
  ApiGetFriendsList,
  ApiGetPendingFriendRequests,
  ApiRejectFriendRequest,
  ApiRemoveFriend,
  ApiSendFriendRequest,
} from './friend.swagger';

@ApiTags('Friends')
@Controller('friends')
@ApiBearerAuth('access-token')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  @ApiSendFriendRequest()
  async sendRequest(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: SendFriendRequestDto,
  ) {
    return await this.friendService.sendRequest(user.id, dto.receiverId);
  }

  @Post('request/:requestId/accept')
  @ApiAcceptFriendRequest()
  async acceptRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return await this.friendService.acceptRequest(user.id, requestId);
  }

  @Post('request/:requestId/reject')
  @ApiRejectFriendRequest()
  async rejectRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return await this.friendService.rejectRequest(user.id, requestId);
  }

  @Post('request/:requestId/cancel')
  @ApiCancelFriendRequest()
  async cancelRequest(
    @CurrentUser() user: CurrentUserDto,
    @Param('requestId') requestId: string,
  ) {
    return await this.friendService.cancelRequest(user.id, requestId);
  }

  @Get()
  @ApiGetFriendsList()
  async getFriends(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetFriendsQueryDto,
  ) {
    return await this.friendService.getFriends(user.id, query);
  }

  @Get('requests/pending')
  @ApiGetPendingFriendRequests()
  async getPendingRequests(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetPendingRequestsQueryDto,
  ) {
    return await this.friendService.getPendingRequests(user.id, query);
  }

  @Delete(':friendId')
  @HttpCode(HttpStatus.OK)
  @ApiRemoveFriend()
  async removeFriend(
    @CurrentUser() user: CurrentUserDto,
    @Param('friendId') friendId: string,
  ): Promise<{ success: boolean; message: string }> {
    return await this.friendService.removeFriend(user.id, friendId);
  }
}
