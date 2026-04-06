import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FriendService } from './friend.service';
import { FriendPaginationDto, UserCommonPaginationDto } from 'src/shared/dtos/user.dto';
import { FriendTopics } from 'src/shared/constants/topic.constant';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @MessagePattern(FriendTopics.SendRequest)
  async sendRequest(@Payload() data: { userId: string; receiverId: string }) {
    return this.friendService.sendRequest(data.userId, data.receiverId);
  }

  @MessagePattern(FriendTopics.AcceptRequest)
  async acceptRequest(@Payload() data: { userId: string; requestId: string }) {
    return this.friendService.acceptRequest(data.userId, data.requestId);
  }

  @MessagePattern(FriendTopics.RejectRequest)
  async rejectRequest(@Payload() data: { userId: string; requestId: string }) {
    return this.friendService.rejectRequest(data.userId, data.requestId);
  }

  @MessagePattern(FriendTopics.GetFriends)
  async getFriends(@Payload() data: FriendPaginationDto) {
    return this.friendService.getFriends(data);
  }

  @MessagePattern(FriendTopics.GetPendingRequests)
  async getPendingRequests(
    @Payload() data: FriendPaginationDto) {
    return this.friendService.getPendingRequests(data);
  }

  @MessagePattern(FriendTopics.RemoveFriend)
  async removeFriend(@Payload() data: { userId: string; friendId: string }) {
    return this.friendService.removeFriend(data.userId, data.friendId);
  }

  @MessagePattern(FriendTopics.CancelRequest)
  async cancelRequest(@Payload() data: { userId: string; requestId: string }) {
    return this.friendService.cancelRequest(data.userId, data.requestId);
  }
}
