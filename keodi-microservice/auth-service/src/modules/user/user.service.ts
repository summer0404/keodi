import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { handleServiceErrorCatching } from 'src/shared/utils/error.helper';
import { UserTopics } from 'src/shared/constants/topic.constant';
import { UserErrorMessages } from 'src/shared/constants/error.constant';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly kafkaService: KafkaService,
  ) {}

  async unverifyUser(userId: string) {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: UserErrorMessages.USER_NOT_FOUND,
        });

      if (existingUser.isVerified) {
        await this.prismaService.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            isVerified: false,
          },
        });
      }

      return { message: 'User unverified successfully' };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async updateUsername(
    userId: string,
    newUsername: string,
    accessToken: string,
  ) {
    try {
      const existingUsername = await this.prismaService.user.findUnique({
        where: { username: newUsername },
      });
      if (existingUsername)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: UserErrorMessages.USERNAME_ALREADY_EXISTS,
        });

      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });
      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: UserErrorMessages.USER_NOT_FOUND,
        });

      await this.prismaService.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          username: newUsername,
        },
      });
      try {
        await this.kafkaService.sendWithTimeout(UserTopics.UsernameSynced, {
          userId: existingUser.id,
          username: newUsername,
        });
      } catch (error) {
        await this.prismaService.user.update({
          where: { id: existingUser.id },
          data: { username: existingUser.username },
        });

        handleServiceErrorCatching(error);
      }

      await this.redisService.set(
        `blacklist_token:${accessToken}`,
        'true',
        3600,
      );

      return { message: 'Username updated successfully' };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async createUserInfomation(
    userId: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    picture?: string,
  ) {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });
      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: UserErrorMessages.USER_NOT_FOUND,
        });

      await this.kafkaService.sendWithTimeout(UserTopics.Create, {
        userId: existingUser.id,
        username: existingUser.username ?? username,
        firstName,
        lastName,
        picture,
      });
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }
}
