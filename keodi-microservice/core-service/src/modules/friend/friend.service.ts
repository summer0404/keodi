import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { FriendRequestStatus } from '@prisma/client';
import { FriendSortBy, SortOrder } from 'src/common/enums/sort.enum';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class FriendService {
  constructor(private readonly prismaService: PrismaService) { }

  async sendRequest(senderId: string, receiverId: string) {
    // Can't send invite to yourself
    if (senderId == receiverId) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Cannot send friend request to yourself',
      });
    }

    // Check if receiver exists
    const receiver = await this.prismaService.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'User not found',
      });
    }

    //Check if already friends
    const existingFriendship = await this.prismaService.friendship.findUnique({
      where: { userId_friendId: { userId: senderId, friendId: receiverId } },
    });
    if (existingFriendship) {
      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: 'Already friends with this user',
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
        message: 'Friend request already exist',
      });
    }

    try {
      // Delete any old rejected/accepted requests to allow resending
      await this.prismaService.friendRequest.deleteMany({
        where: {
          senderId,
          receiverId,
          status: {
            in: [FriendRequestStatus.REJECTED, FriendRequestStatus.ACCEPTED],
          },
        },
      });

      return await this.prismaService.friendRequest.create({
        data: { senderId, receiverId },
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error(error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
      });
    }
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prismaService.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Friend request not found',
      });
    }

    // Only receiver can accept
    if (request.receiverId !== userId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'Not authorized to accept this request',
      });
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Request is no longer valid',
      });
    }

    try {
      return await this.prismaService.$transaction(async (tx) => {
        await tx.friendRequest.update({
          where: { id: requestId },
          data: { status: FriendRequestStatus.ACCEPTED },
        });

        await tx.friendship.createMany({
          data: [
            { userId: request.senderId, friendId: request.receiverId },
            { userId: request.receiverId, friendId: request.senderId },
          ],
        });

        return { success: true, message: 'Friend request accepted' };
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error(error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
      });
    }
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prismaService.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Friend request not found',
      });
    }

    // Only receiver can reject
    if (request.receiverId !== userId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'Not authorized to reject this request',
      });
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Request is no longer valid',
      });
    }

    try {
      await this.prismaService.friendRequest.update({
        where: { id: requestId },
        data: { status: FriendRequestStatus.REJECTED },
      });

      return { success: true, message: 'Friend request rejected' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error(error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
      });
    }
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.prismaService.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Friend request not found',
      });
    }

    // Only sender can cancel

    if (request.senderId !== userId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'Not authorized to cancel this request',
      });
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Request is no longer valid',
      });
    }
    try {
      await this.prismaService.friendRequest.delete({
        where: { id: requestId },
      });

      return { success: true, message: 'Friend request cancelled' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error(error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
      });
    }
  }

  async getFriends(
    userId: string,
    page: number,
    limit: number,
    sortBy: FriendSortBy = FriendSortBy.CREATED_AT,
    sortOrder: SortOrder = SortOrder.DESC,
  ) {
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
                firstName: true,
                lastName: true,
                pictureUrl: true,
              },
            },
          },
        }),
        this.prismaService.friendship.count({ where: { userId } }),
      ]);

      return {
        friends,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error(error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
      });
    }
  }

  async getPendingRequests(
    userId: string,
    page: number,
    limit: number,
    sortBy: FriendSortBy = FriendSortBy.CREATED_AT,
    sortOrder: SortOrder = SortOrder.DESC,
  ) {
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

      return {
        requests,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error(error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
      });
    }
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prismaService.friendship.findUnique({
      where: { userId_friendId: { userId, friendId } },
    });

    if (!friendship) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Friendship not found',
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
      if (error instanceof RpcException) throw error;
      console.error(error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
      });
    }
  }
}
