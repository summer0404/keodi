import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { createId } from '@paralleldrive/cuid2';
import { GroupSession } from '@prisma/client';
import { randomBytes } from 'crypto';
import { SessionStatus } from 'src/common/enums/group-session.enum';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class GroupSessionService {
  private static readonly SHARE_CODE_LENGTH = 6;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private generateShareCode(
    length: number = GroupSessionService.SHARE_CODE_LENGTH,
  ): string {
    const chars = this.configService.get<string>('SHARE_CODE_CHARS');
    if (!chars) {
      throw new Error(
        'SHARE_CODE_CHARS is not configured in environment variables',
      );
    }
    let result = '';
    const bytes = randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }

    return result;
  }

  private async checkActiveSession(userId: string): Promise<void> {
    const existingActiveMembership =
      await this.prismaService.groupSessionMember.findFirst({
        where: {
          userId,
          session: { status: SessionStatus.ACTIVE },
        },
        include: { session: true },
      });

    if (existingActiveMembership) {
      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: `You are already in an active session (${existingActiveMembership.session.shareCode}). Please leave or close it first.`,
      });
    }
  }

  async create(userId: string): Promise<GroupSession> {
    // Check if user is already in an active session
    await this.checkActiveSession(userId);

    let session: GroupSession | null = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const shareCode = this.generateShareCode();

        session = await this.prismaService.$transaction(async (prisma) => {
          const newSession = await prisma.groupSession.create({
            data: {
              createdBy: userId,
              shareCode: shareCode,
              status: SessionStatus.ACTIVE,
            },
          });

          await prisma.groupSessionMember.create({
            data: {
              sessionId: newSession.sessionId,
              userId: userId,
            },
          });

          return newSession;
        });

        break; // Exit loop on success
      } catch (error) {
        attempts++;
        // Retry on unique constraint violation
        if (error && typeof error === 'object' && error.code === 'P2002') {
          if (attempts >= maxAttempts) {
            break;
          }
          continue;
        }
        throw error;
      }
    }

    if (!session) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate unique share code',
      });
    }
    return session;
  }

  async join(data: {
    shareCode: string;
    userId?: string;
    nickname?: string;
    guestId?: string; // returning guest sends this
  }) {
    const { shareCode, userId, nickname, guestId: existingGuestId } = data;

    const session = await this.prismaService.groupSession.findUnique({
      where: { shareCode },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                pictureUrl: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pictureUrl: true,
          },
        },
      },
    });

    if (!session) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Session not found',
      });
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Session is no longer active',
      });
    }

    // Check if user is already in another active session
    if (userId) {
      const existingActiveMembership =
        await this.prismaService.groupSessionMember.findFirst({
          where: {
            userId,
            session: { status: SessionStatus.ACTIVE },
            sessionId: { not: session.sessionId },
          },
          include: { session: true },
        });

      if (existingActiveMembership) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: `You are already in an active session (${existingActiveMembership.session.shareCode}). Please leave or close it first.`,
        });
      }
    }

    // Guest must provide a nickname
    if (!userId && !existingGuestId && !nickname) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Nickname is required for guest users',
      });
    }

    // Check if returning guest
    if (!userId && existingGuestId) {
      const existingMember = session.members.find(
        (m) => m.guestId === existingGuestId,
      );
      if (existingMember) {
        return {
          sessionId: session.sessionId,
          shareCode: session.shareCode,
          createdBy: session.createdBy,
          creator: session.creator,
          createdAt: session.createdAt,
          status: session.status,
          memberCount: session.members.length,
          member: existingMember,
          alreadyJoined: true,
        };
      }
    }

    const guestId = userId ? undefined : existingGuestId || createId();

    const member = await this.prismaService.groupSessionMember.create({
      data: {
        sessionId: session.sessionId,
        userId: userId ?? null,
        guestId,
        nickname: nickname ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pictureUrl: true,
          },
        },
      },
    });

    return {
      sessionId: session.sessionId,
      shareCode: session.shareCode,
      createdBy: session.createdBy,
      creator: session.creator,
      createdAt: session.createdAt,
      status: session.status,
      memberCount: session.members.length + 1,
      members: [...session.members, member],
      member: member,
      alreadyJoined: false,
    };
  }

  async inviteFriend(data: {
    sessionId: string;
    inviterId: string;
    friendId: string;
  }) {
    const { sessionId, inviterId, friendId } = data;

    const session = await this.prismaService.groupSession.findUnique({
      where: { sessionId },
      include: { members: true },
    });

    if (!session || session.status !== SessionStatus.ACTIVE) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Active session not found',
      });
    }

    const isMember = session.members.some((m) => m.userId === inviterId);
    if (!isMember) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'You are not a member of this session',
      });
    }
    //Check if the person is really friend
    const friendship = await this.prismaService.friendship.findUnique({
      where: { userId_friendId: { userId: inviterId, friendId } },
    });
    if (!friendship) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'You can only invite friends',
      });
    }

    const alreadyJoined = session.members.some((m) => m.userId === friendId);
    if (alreadyJoined) {
      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: 'User is already a member of this session',
      });
    }

    return {
      sessionId,
      shareCode: session.shareCode,
      inviterId,
      friendId,
    };
  }

  async close(data: { sessionId: string; userId: string }) {
    const { sessionId, userId } = data;

    const session = await this.prismaService.groupSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Session not found',
      });
    }

    if (session.createdBy !== userId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'Only the session creator can close the session',
      });
    }

    if (session.status === SessionStatus.CLOSED) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Session is already closed',
      });
    }

    return await this.prismaService.groupSession.update({
      where: { sessionId },
      data: { status: SessionStatus.CLOSED },
    });
  }
}
