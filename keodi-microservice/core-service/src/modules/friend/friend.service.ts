import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { createId } from '@paralleldrive/cuid2';
import { FriendRequestStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  FriendErrorMessages,
  UserErrorMessages,
} from 'src/shared/constants/error.constant';
import { NotificationTopics } from 'src/shared/constants/topic.constant';
import { FriendPaginationDto } from 'src/shared/dtos/user.dto';
import {
  NotificationPreferredChannel,
  NotificationType,
} from 'src/shared/enums/notification.enum';
import { FriendSortBy } from 'src/shared/enums/sort.enum';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';
import { ImageService } from '../image/image.service';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationType } from 'src/shared/enums/chat.enum';

@Injectable()
export class FriendService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly imageService: ImageService,
    private readonly kafkaService: KafkaService,
    private readonly conversationService: ConversationService,
  ) {}

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId == receiverId) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: FriendErrorMessages.CANNOT_SEND_REQUEST_TO_SELF,
      });
    }

    const receiver = await this.prismaService.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: UserErrorMessages.USER_NOT_FOUND,
      });
    }

    const existingFriendship = await this.prismaService.friendship.findUnique({
      where: { userId_friendId: { userId: senderId, friendId: receiverId } },
    });
    if (existingFriendship) {
      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: FriendErrorMessages.ALREADY_FRIENDS_WITH_USER,
      });
    }

    const existingRequest = await this.prismaService.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: FriendRequestStatus.PENDING },
          {
            senderId: receiverId,
            receiverId: senderId,
            status: FriendRequestStatus.PENDING,
          },
        ],
      },
    });
    if (existingRequest) {
      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: FriendErrorMessages.FRIEND_REQUEST_ALREADY_EXISTS,
      });
    }

    try {
      await this.prismaService.friendRequest.deleteMany({
        where: {
          senderId,
          receiverId,
          status: {
            in: [FriendRequestStatus.REJECTED, FriendRequestStatus.ACCEPTED],
          },
        },
      });

      const request = await this.prismaService.friendRequest.create({
        data: { senderId, receiverId },
      });

      const sender = await this.prismaService.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true, pictureUrl: true },
      });
      const senderName =
        [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') ||
        'Someone';
      const senderPictureUrl = sender?.pictureUrl
        ? await this.imageService.getImageViewUrl(sender.pictureUrl)
        : null;

      this.kafkaService.getClient().emit(NotificationTopics.Dispatch, {
        eventId: createId(),
        userId: receiverId,
        type: NotificationType.FRIEND_REQUEST,
        title: 'New Friend Request',
        body: `${senderName} sent you a friend request`,
        data: { senderId, requestId: request.id, senderName, senderPictureUrl },
        deepLink: `frontend://friends/requests`,
        preferredChannel: NotificationPreferredChannel.BOTH,
        createdAt: new Date().toISOString(),
      });

      return request;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prismaService.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: FriendErrorMessages.FRIEND_REQUEST_NOT_FOUND,
      });
    }

    if (request.receiverId !== userId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: FriendErrorMessages.NOT_AUTHORIZED_TO_ACCEPT_REQUEST,
      });
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: FriendErrorMessages.REQUEST_IS_NO_LONGER_VALID,
      });
    }

    try {
      return await this.prismaService.$transaction(async (prisma) => {
        await prisma.friendRequest.update({
          where: { id: requestId },
          data: { status: FriendRequestStatus.ACCEPTED },
        });

        await prisma.friendship.createMany({
          data: [
            { userId: request.senderId, friendId: request.receiverId },
            { userId: request.receiverId, friendId: request.senderId },
          ],
        });

        const accepter = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, pictureUrl: true },
        });

        await this.conversationService.create({
          type: ConversationType.DIRECT,
          createdById: userId,
          memberIds: [request.senderId],
        });

        const accepterName =
          [accepter?.firstName, accepter?.lastName].filter(Boolean).join(' ') ||
          'Someone';
        const accepterPictureUrl = accepter?.pictureUrl
          ? await this.imageService.getImageViewUrl(accepter.pictureUrl)
          : null;

        this.kafkaService.getClient().emit(NotificationTopics.Dispatch, {
          eventId: createId(),
          userId: request.senderId,
          type: NotificationType.FRIEND_ACCEPTED,
          title: 'Friend Request Accepted',
          body: `${accepterName} accepted your friend request`,
          data: { accepterId: userId, accepterName, accepterPictureUrl },
          deepLink: `frontend://friends`,
          preferredChannel: NotificationPreferredChannel.BOTH,
          createdAt: new Date().toISOString(),
        });

        return { success: true, message: 'Friend request accepted' };
      });
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prismaService.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: FriendErrorMessages.FRIEND_REQUEST_NOT_FOUND,
      });
    }

    if (request.receiverId !== userId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: FriendErrorMessages.NOT_AUTHORIZED_TO_REJECT_REQUEST,
      });
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: FriendErrorMessages.REQUEST_IS_NO_LONGER_VALID,
      });
    }

    try {
      await this.prismaService.friendRequest.update({
        where: { id: requestId },
        data: { status: FriendRequestStatus.REJECTED },
      });

      return { success: true, message: 'Friend request rejected' };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.prismaService.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: FriendErrorMessages.FRIEND_REQUEST_NOT_FOUND,
      });
    }

    // Only sender can cancel

    if (request.senderId !== userId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: FriendErrorMessages.NOT_AUTHORIZED_TO_CANCEL_REQUEST,
      });
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: FriendErrorMessages.REQUEST_IS_NO_LONGER_VALID,
      });
    }
    try {
      await this.prismaService.friendRequest.delete({
        where: { id: requestId },
      });

      return { success: true, message: 'Friend request cancelled' };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getFriends(friendPaginationDto: FriendPaginationDto) {
    const { userId, page, limit, sortBy, sortOrder } = friendPaginationDto;

    try {
      const offset = (page - 1) * limit;
      // Build orderBy based on sortBy parameter
      let orderBy: any;
      if (sortBy === FriendSortBy.NAME) {
        // Sort by friend's firstName and lastName
        orderBy = [
          { friend: { firstName: sortOrder } },
          { friend: { lastName: sortOrder } },
        ];
      } else {
        orderBy = { createdAt: sortOrder }; //default
      }

      const [friends, total] = await Promise.all([
        this.prismaService.friendship.findMany({
          where: { userId },
          skip: offset,
          take: limit,
          orderBy,
          include: {
            friend: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                pictureUrl: true,
              },
            },
          },
        }),
        this.prismaService.friendship.count({ where: { userId } }),
      ]);

      const friendsWithViewablePictureUrl = await Promise.all(
        friends.map(async (friendship) => ({
          ...friendship,
          friend: {
            ...friendship.friend,
            pictureUrl: friendship.friend.pictureUrl
              ? await this.imageService.getImageViewUrl(
                  friendship.friend.pictureUrl,
                )
              : null,
          },
        })),
      );

      return {
        friends: friendsWithViewablePictureUrl,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getPendingRequests(friendPaginationDto: FriendPaginationDto) {
    const { userId, page, limit, sortBy, sortOrder } = friendPaginationDto;

    try {
      const offset = (page - 1) * limit;

      let orderBy: any;
      if (sortBy === FriendSortBy.NAME) {
        // Sort by sender's firstName and lastName
        orderBy = [
          { sender: { firstName: sortOrder } },
          { sender: { lastName: sortOrder } },
        ];
      } else {
        orderBy = { createdAt: sortOrder };
      }

      const [requests, total] = await Promise.all([
        this.prismaService.friendRequest.findMany({
          where: {
            receiverId: userId,
            status: FriendRequestStatus.PENDING,
          },
          skip: offset,
          take: limit,
          orderBy,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                pictureUrl: true,
              },
            },
          },
        }),
        this.prismaService.friendRequest.count({
          where: { receiverId: userId, status: FriendRequestStatus.PENDING },
        }),
      ]);

      const requestsWithViewablePictureUrl = await Promise.all(
        requests.map(async (request) => ({
          ...request,
          sender: {
            ...request.sender,
            pictureUrl: request.sender.pictureUrl
              ? await this.imageService.getImageViewUrl(
                  request.sender.pictureUrl,
                )
              : null,
          },
        })),
      );

      return {
        requests: requestsWithViewablePictureUrl,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prismaService.friendship.findUnique({
      where: { userId_friendId: { userId, friendId } },
    });

    if (!friendship) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: FriendErrorMessages.FRIENDSHIP_NOT_FOUND,
      });
    }

    try {
      await this.prismaService.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId },
          ],
        },
      });

      return { success: true, message: 'Friend removed successfully' };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
