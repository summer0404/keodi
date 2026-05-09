import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { ChatErrorMessages } from 'src/shared/constants/error.constant';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import {
  AddMembersPayloadDto,
  LeaveConversationPayloadDto,
} from 'src/shared/dtos/chat.dto';
import { ConversationType } from 'src/shared/enums/chat.enum';

@Injectable()
export class MemberService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async add(payload: AddMembersPayloadDto) {
    const { conversationId, requesterId, memberIds } = payload;

    const requester = await this.prismaService.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: requesterId } },
    });
    if (!requester) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: ChatErrorMessages.NOT_A_MEMBER,
      });
    }

    const conversation = await this.prismaService.conversation.findFirst({
      where: { id: conversationId, type: ConversationType.GROUP },
    });
    if (!conversation) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: ChatErrorMessages.CONVERSATION_NOT_FOUND_OR_NOT_GROUP,
      });
    }

    await this.prismaService.conversationMember.createMany({
      data: memberIds.map((userId) => ({ conversationId, userId })),
      skipDuplicates: true,
    });

    await this.redisService.del(RedisKeys.CHAT_MEMBERS(conversationId));
    return { success: true };
  }

  async leave(payload: LeaveConversationPayloadDto) {
    const { conversationId, userId } = payload;

    const member = await this.prismaService.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: ChatErrorMessages.NOT_A_MEMBER,
      });
    }

    await this.prismaService.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });

    await this.redisService.del(RedisKeys.CHAT_MEMBERS(conversationId));
    return { success: true };
  }
}
