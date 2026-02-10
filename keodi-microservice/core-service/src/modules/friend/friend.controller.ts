import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FriendService } from './friend.service';
import { UserCommonPaginationDto } from 'src/common/dtos/user.dto';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @MessagePattern('friend.send-request')
  async sendRequest(@Payload() data: { userId: string; receiverId: string }) {
    return this.friendService.sendRequest(data.userId, data.receiverId);
  }

  @MessagePattern('friend.accept-request')
  async acceptRequest(@Payload() data: { userId: string; requestId: string }) {
    return this.friendService.acceptRequest(data.userId, data.requestId);
  }

  @MessagePattern('friend.reject-request')
  async rejectRequest(@Payload() data: { userId: string; requestId: string }) {
    return this.friendService.rejectRequest(data.userId, data.requestId);
  }

  @MessagePattern('friend.get-friends')
  async getFriends(@Payload() data: UserCommonPaginationDto) {
    return this.friendService.getFriends(data);
  }

  @MessagePattern('friend.get-pending-requests')
  async getPendingRequests(
    @Payload() data: UserCommonPaginationDto) {
    return this.friendService.getPendingRequests(data);
  }

  @MessagePattern('friend.remove-friend')
  async removeFriend(@Payload() data: { userId: string; friendId: string }) {
    return this.friendService.removeFriend(data.userId, data.friendId);
  }

  @MessagePattern('friend.cancel-request')
  async cancelRequest(@Payload() data: { userId: string; requestId: string }) {
    return this.friendService.cancelRequest(data.userId, data.requestId);
  }
}
