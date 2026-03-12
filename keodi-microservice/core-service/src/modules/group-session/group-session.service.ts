import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { createId } from '@paralleldrive/cuid2';
import {
  GroupSessionStatus,
  VoteStatus,
  type GroupSession,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { handleServiceErrorCatching } from 'src/common/helpers/error.helper';
import { buildVoteResults } from 'src/common/helpers/group-session.helper';
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
          session: { status: GroupSessionStatus.ACTIVE },
        },
      });

    if (existingActiveMembership) {
      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: 'SESSION_ALREADY_ACTIVE',
      });
    }
  }

  async create(userId: string) {
    try {
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
                status: GroupSessionStatus.ACTIVE,
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

          break;
        } catch (error) {
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            (error as { code?: string }).code === 'P2002'
          ) {
            attempts++;
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
          message: 'SHARE_CODE_GENERATION_FAILED',
        });
      }

      return session;
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async join(data: {
    shareCode: string;
    userId?: string;
    nickname?: string;
    guestId?: string; // returning guest sends this
  }) {
    try {
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
          message: 'SESSION_NOT_FOUND',
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'SESSION_NOT_ACTIVE',
        });
      }

      // Check if user is already in another active session
      if (userId) {
        const existingActiveMembership =
          await this.prismaService.groupSessionMember.findFirst({
            where: {
              userId,
              session: { status: GroupSessionStatus.ACTIVE },
              sessionId: { not: session.sessionId },
            },
          });

        if (existingActiveMembership) {
          throw new RpcException({
            status: HttpStatus.CONFLICT,
            message: 'SESSION_ALREADY_ACTIVE',
          });
        }

        // Check if user is already a member of this session
        const existingMember = session.members.find((m) => m.userId === userId);
        if (existingMember) {
          return {
            sessionId: session.sessionId,
            shareCode: session.shareCode,
            createdBy: session.createdBy,
            creator: session.creator,
            createdAt: session.createdAt,
            status: session.status,
            memberCount: session.members.length,
            members: session.members,
            member: existingMember,
            alreadyJoined: true,
          };
        }
      }

      // Guest must provide a nickname
      if (!userId && !existingGuestId && !nickname) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'NICKNAME_REQUIRED',
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
            members: session.members,
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
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async inviteFriend(data: {
    sessionId: string;
    inviterId: string;
    friendId: string;
  }) {
    try {
      const { sessionId, inviterId, friendId } = data;

      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
        include: { members: true },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'SESSION_NOT_FOUND',
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'SESSION_NOT_ACTIVE',
        });
      }

      const isMember = session.members.some((m) => m.userId === inviterId);
      if (!isMember) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'NOT_A_MEMBER',
        });
      }

      const friendship = await this.prismaService.friendship.findUnique({
        where: { userId_friendId: { userId: inviterId, friendId } },
      });
      if (!friendship) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'INVITE_FRIENDS_ONLY',
        });
      }

      const alreadyJoined = session.members.some((m) => m.userId === friendId);
      if (alreadyJoined) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'ALREADY_A_MEMBER',
        });
      }

      return {
        sessionId,
        shareCode: session.shareCode,
        inviterId,
        friendId,
      };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async close(data: { sessionId: string; userId: string }) {
    try {
      const { sessionId, userId } = data;

      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'SESSION_NOT_FOUND',
        });
      }

      if (session.createdBy !== userId) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'NOT_SESSION_CREATOR',
        });
      }

      if (session.status === GroupSessionStatus.CLOSED) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'SESSION_ALREADY_CLOSED',
        });
      }

      return await this.prismaService.groupSession.update({
        where: { sessionId },
        data: { status: GroupSessionStatus.CLOSED },
      });
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async castVote(data: {
    sessionId: string;
    placeId: string;
    userId?: string;
    guestId?: string;
  }) {
    try {
      const { sessionId, placeId, userId, guestId } = data;

      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'SESSION_NOT_FOUND',
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'SESSION_NOT_ACTIVE',
        });
      }

      if (session.voteStatus === VoteStatus.FINALIZED) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'VOTE_ALREADY_FINALIZED',
        });
      }

      // Resolve member: by userId for authenticated users, by guestId for guests
      const member = await this.prismaService.groupSessionMember.findFirst({
        where: userId ? { userId, sessionId } : { guestId, sessionId },
      });

      if (!member) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'NOT_A_MEMBER',
        });
      }

      const vote = await this.prismaService.$transaction(async (prisma) => {
        const currentVote = await prisma.sessionVote.findUnique({
          where: { memberId: member.id },
        });

        if (currentVote?.isFinalized) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'VOTE_ALREADY_FINALIZED',
          });
        }

        return prisma.sessionVote.upsert({
          where: { memberId: member.id },
          create: {
            sessionId,
            memberId: member.id,
            placeId,
          },
          update: {
            placeId,
          },
          include: {
            place: {
              select: {
                id: true,
                name: true,
                featureImageUrl: true,
                rating: true,
                fullAddress: true,
              },
            },
            member: {
              select: {
                id: true,
                userId: true,
                guestId: true,
                nickname: true,
              },
            },
          },
        });
      });

      return vote;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'P2003'
      ) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'PLACE_NOT_FOUND',
        });
      }
      handleServiceErrorCatching(error);
    }
  }

  async finalizeMemberVote(data: {
    sessionId: string;
    userId?: string;
    guestId?: string;
  }) {
    try {
      const { sessionId, userId, guestId } = data;

      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
        include: { members: true },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'SESSION_NOT_FOUND',
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'SESSION_NOT_ACTIVE',
        });
      }

      if (session.voteStatus === VoteStatus.FINALIZED) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'VOTE_ALREADY_FINALIZED',
        });
      }

      // Resolve member: by userId for authenticated users, by guestId for guests
      const member = userId
        ? session.members.find((m) => m.userId === userId)
        : session.members.find((m) => m.guestId === guestId);

      if (!member) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'NOT_A_MEMBER',
        });
      }

      const existingVote = await this.prismaService.sessionVote.findUnique({
        where: { memberId: member.id },
      });

      if (!existingVote) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'VOTE_REQUIRED_BEFORE_FINALIZE',
        });
      }

      if (existingVote.isFinalized) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'VOTE_ALREADY_FINALIZED',
        });
      }

      const updatedVote = await this.prismaService.sessionVote.update({
        where: { id: existingVote.id },
        data: { isFinalized: true },
        include: {
          place: {
            select: {
              id: true,
              name: true,
              featureImageUrl: true,
              rating: true,
              fullAddress: true,
            },
          },
        },
      });

      const totalMembers = session.members.length;
      const finalizedVotes = await this.prismaService.sessionVote.count({
        where: { sessionId, isFinalized: true },
      });

      let voteAutoFinalized = false;

      if (finalizedVotes >= totalMembers) {
        const allVotes = await this.prismaService.sessionVote.findMany({
          where: { sessionId },
          include: {
            place: {
              select: {
                id: true,
                name: true,
                featureImageUrl: true,
                rating: true,
                fullAddress: true,
              },
            },
            member: {
              select: { id: true, userId: true, guestId: true, nickname: true },
            },
          },
        });
        const autoVoteResults = buildVoteResults(allVotes);
        const winningPlaceId = autoVoteResults[0]?.place?.id ?? null;

        await this.prismaService.groupSession.updateMany({
          where: { sessionId, voteStatus: VoteStatus.OPEN },
          data: {
            voteStatus: VoteStatus.FINALIZED,
            finalizedAt: new Date(),
            winningPlaceId,
          },
        });
        voteAutoFinalized = true;
      }

      return {
        vote: updatedVote,
        voteAutoFinalized,
      };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async finalizeSessionVote(data: { sessionId: string; userId: string }) {
    try {
      const { sessionId, userId } = data;

      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
        include: {
          members: true,
          votes: {
            include: {
              place: {
                select: {
                  id: true,
                  name: true,
                  featureImageUrl: true,
                  rating: true,
                  fullAddress: true,
                },
              },
              member: {
                select: {
                  id: true,
                  userId: true,
                  guestId: true,
                  nickname: true,
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
            },
          },
        },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'SESSION_NOT_FOUND',
        });
      }

      if (session.createdBy !== userId) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'NOT_SESSION_CREATOR',
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'SESSION_NOT_ACTIVE',
        });
      }

      if (session.voteStatus === VoteStatus.FINALIZED) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'VOTE_ALREADY_FINALIZED',
        });
      }

      const voteResults = buildVoteResults(session.votes);
      const winningPlaceId = voteResults[0]?.place?.id ?? null;

      await this.prismaService.$transaction([
        this.prismaService.sessionVote.updateMany({
          where: { sessionId, isFinalized: false },
          data: { isFinalized: true },
        }),
        this.prismaService.groupSession.update({
          where: { sessionId },
          data: {
            voteStatus: VoteStatus.FINALIZED,
            finalizedAt: new Date(),
            winningPlaceId,
          },
        }),
      ]);

      return {
        sessionId,
        voteStatus: VoteStatus.FINALIZED,
        totalMembers: session.members.length,
        totalVotes: session.votes.length,
        winningPlaceId,
        results: voteResults,
      };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async getSession(sessionId: string) {
    try {
      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              pictureUrl: true,
            },
          },
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
          winningPlace: {
            select: {
              id: true,
              name: true,
              featureImageUrl: true,
              rating: true,
              fullAddress: true,
            },
          },
        },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'SESSION_NOT_FOUND',
        });
      }

      return session;
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async getVotes(sessionId: string) {
    try {
      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
        include: {
          members: {
            select: {
              id: true,
              userId: true,
              guestId: true,
              nickname: true,
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
          votes: {
            include: {
              place: {
                select: {
                  id: true,
                  name: true,
                  featureImageUrl: true,
                  rating: true,
                  fullAddress: true,
                },
              },
              member: {
                select: {
                  id: true,
                  userId: true,
                  guestId: true,
                  nickname: true,
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
            },
          },
        },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'SESSION_NOT_FOUND',
        });
      }

      const voteResults = buildVoteResults(session.votes);

      return {
        sessionId,
        voteStatus: session.voteStatus,
        totalMembers: session.members.length,
        totalVotes: session.votes.length,
        finalizedCount: session.votes.filter((v) => v.isFinalized).length,
        votes: session.votes,
        results: voteResults,
      };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }
}
