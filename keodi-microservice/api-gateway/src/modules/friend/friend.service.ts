import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { PaginationConstants } from 'src/shared/constants/pagination.constants';
import {
  GetFriendsQueryDto,
  GetPendingRequestsQueryDto,
} from 'src/shared/dtos/friend.dto';
import { FriendSortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { FriendTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class FriendService {
  constructor(private readonly kafkaService: KafkaService) {}

  async sendRequest(userId: string, receiverId: string) {
    return this.kafkaService.sendWithTimeout(FriendTopics.SendRequest, {
      userId,
      receiverId,
    });
  }

  async acceptRequest(userId: string, requestId: string) {
    return this.kafkaService.sendWithTimeout(FriendTopics.AcceptRequest, {
      userId,
      requestId,
    });
  }

  async rejectRequest(userId: string, requestId: string) {
    return this.kafkaService.sendWithTimeout(FriendTopics.RejectRequest, {
      userId,
      requestId,
    });
  }

  async cancelRequest(userId: string, requestId: string) {
    return this.kafkaService.sendWithTimeout(FriendTopics.CancelRequest, {
      userId,
      requestId,
    });
  }

  async getFriends(userId: string, query: GetFriendsQueryDto) {
    return this.kafkaService.sendWithTimeout(FriendTopics.GetFriends, {
      userId,
      page: query.page || PaginationConstants.DEFAULT_PAGE,
      limit: query.limit || PaginationConstants.DEFAULT_LIMIT,
      sortBy: query.sortBy || FriendSortBy.CREATED_AT,
      sortOrder: query.sortOrder || SortOrder.DESC,
    });
  }

  async getPendingRequests(userId: string, query: GetPendingRequestsQueryDto) {
    return this.kafkaService.sendWithTimeout(FriendTopics.GetPendingRequests, {
      userId,
      page: query.page || PaginationConstants.DEFAULT_PAGE,
      limit: query.limit || PaginationConstants.DEFAULT_LIMIT,
      sortBy: query.sortBy || FriendSortBy.CREATED_AT,
      sortOrder: query.sortOrder || SortOrder.DESC,
    });
  }

  async removeFriend(userId: string, friendId: string) {
    return this.kafkaService.sendWithTimeout(FriendTopics.RemoveFriend, {
      userId,
      friendId,
    });
  }
}
