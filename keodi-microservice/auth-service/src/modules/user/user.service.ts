import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { UserTopics } from 'src/shared/constants/topic.constant';
import { lastValueFrom } from 'rxjs';

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
          message: 'User not found',
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
          message: 'Username already used',
        });

      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });
      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User not found',
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
        const kafka = this.kafkaService.getClient();

        await lastValueFrom(
          kafka.send(UserTopics.UsernameSynced, {
            userId: existingUser.id,
            username: newUsername,
          })
        );
      } catch (error) {
        await this.prismaService.user.update({
          where: { id: existingUser.id },
          data: {username: existingUser.username},
        });

        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to sync username across services, changes rolled back.',
        })
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
          message: 'User not found',
        });

      const kafka = this.kafkaService.getClient();

      await lastValueFrom(
        kafka.send(UserTopics.Create, {
          userId: existingUser.id,
          username: existingUser.username ?? username,
          firstName,
          lastName,
          picture,
        })
      );
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }
}
