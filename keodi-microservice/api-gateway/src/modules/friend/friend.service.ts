import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { PaginationConstants } from 'src/shared/constants/pagination.constants';
import {
  GetFriendsQueryDto,
  GetPendingRequestsQueryDto,
} from 'src/shared/dtos/friend.dto';
import { FriendSortBy, SortOrder } from 'src/shared/enums/sort.enum';

@Injectable()
export class FriendService {
  constructor(private readonly kafkaService: KafkaService) {}

  async sendRequest(userId: string, receiverId: string) {
    return firstValueFrom(
      this.kafkaService.getClient().send('friend.send-request', { userId, receiverId }),
    );
  }

  async acceptRequest(userId: string, requestId: string) {
    return firstValueFrom(
      this.kafkaService.getClient().send('friend.accept-request', { userId, requestId }),
    );
  }

  async rejectRequest(userId: string, requestId: string) {
    return firstValueFrom(
      this.kafkaService.getClient().send('friend.reject-request', { userId, requestId }),
    );
  }

  async cancelRequest(userId: string, requestId: string) {
    return firstValueFrom(
      this.kafkaService.getClient().send('friend.cancel-request', { userId, requestId }),
    );
  }

  async getFriends(userId: string, query: GetFriendsQueryDto) {
    return firstValueFrom(
      this.kafkaService.getClient().send('friend.get-friends', {
        userId,
        page: query.page || PaginationConstants.DEFAULT_PAGE,
        limit: query.limit || PaginationConstants.DEFAULT_LIMIT,
        sortBy: query.sortBy || FriendSortBy.CREATED_AT,
        sortOrder: query.sortOrder || SortOrder.DESC,
      }),
    );
  }

  async getPendingRequests(userId: string, query: GetPendingRequestsQueryDto) {
    return firstValueFrom(
      this.kafkaService.getClient().send('friend.get-pending-requests', {
        userId,
        page: query.page || PaginationConstants.DEFAULT_PAGE,
        limit: query.limit || PaginationConstants.DEFAULT_LIMIT,
        sortBy: query.sortBy || FriendSortBy.CREATED_AT,
        sortOrder: query.sortOrder || SortOrder.DESC,
      }),
    );
  }

  async removeFriend(userId: string, friendId: string) {
    return firstValueFrom(
      this.kafkaService.getClient().send('friend.remove-friend', { userId, friendId }),
    );
  }
}
