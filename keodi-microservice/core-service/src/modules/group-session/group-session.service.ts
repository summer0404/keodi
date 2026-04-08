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
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  GROUP_SESSION_DEFAULT_AUTO_CLOSE_DELAY_MINUTES,
  GROUP_SESSION_SHARE_CODE_LENGTH,
  GroupSessionMessages,
} from 'src/shared/constants/group-session.constant';
import {
  NotificationPreferredChannel,
  NotificationTopics,
  NotificationType,
} from 'src/shared/constants/notification-topic.constant';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { GroupSessionHelper } from 'src/shared/helpers/group-session.helper';
import { ImageService } from '../image/image.service';

@Injectable()
export class GroupSessionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly groupSessionHelper: GroupSessionHelper,
    private readonly kafkaService: KafkaService,
    private readonly imageService: ImageService,
  ) {}

  private async mapUserPictureUrl<T extends { pictureUrl: string | null }>(
    user: T,
  ): Promise<T> {
    return {
      ...user,
      pictureUrl: user.pictureUrl
        ? await this.imageService.getImageViewUrl(user.pictureUrl)
        : null,
    };
  }

  private async mapMemberPictureUrl<
    T extends { user: { pictureUrl: string | null } | null },
  >(member: T): Promise<T> {
    if (!member.user) return member;
    return { ...member, user: await this.mapUserPictureUrl(member.user) };
  }

  private async mapMembersPictureUrl<
    T extends { user: { pictureUrl: string | null } | null },
  >(members: T[]): Promise<T[]> {
    return Promise.all(
      members.map((member) => this.mapMemberPictureUrl(member)),
    );
  }

  private async mapVotesMemberPictureUrl<
    T extends { member: { user: { pictureUrl: string | null } | null } },
  >(votes: T[]): Promise<T[]> {
    return Promise.all(
      votes.map(async (vote) => ({
        ...vote,
        member: await this.mapMemberPictureUrl(vote.member),
      })),
    );
  }

  private async notifySessionMembers(
    sessionId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const members = await this.prismaService.groupSessionMember.findMany({
      where: { sessionId },
      select: { userId: true },
    });
    const kafka = this.kafkaService.getClient();
    for (const member of members) {
      if (!member.userId) continue;
      kafka.emit(NotificationTopics.RealtimePush, {
        userId: member.userId,
        event: { type: eventType, ...payload },
      });
    }
  }

  private generateShareCode(
    length: number = GROUP_SESSION_SHARE_CODE_LENGTH,
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

  private getAutoCloseDelayMinutes(): number {
    const raw = this.configService.get<string>(
      'GROUP_SESSION_AUTO_CLOSE_DELAY_MINUTES',
    );
    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return GROUP_SESSION_DEFAULT_AUTO_CLOSE_DELAY_MINUTES;
    }

    return Math.floor(parsed);
  }

  private buildAutoCloseAt(finalizedAt: Date): Date {
    const delayMinutes = this.getAutoCloseDelayMinutes();
    return new Date(finalizedAt.getTime() + delayMinutes * 60 * 1000);
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
        message: GroupSessionMessages.SESSION_ALREADY_ACTIVE,
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
          message: GroupSessionMessages.SHARE_CODE_GENERATION_FAILED,
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

      const creatorWithPictureUrl = session?.creator
        ? await this.mapUserPictureUrl(session.creator)
        : null;
      const membersWithPictureUrl = session
        ? await this.mapMembersPictureUrl(session.members)
        : [];

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.SESSION_NOT_ACTIVE,
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
            message: GroupSessionMessages.SESSION_ALREADY_ACTIVE,
          });
        }

        // Check if user is already a member of this session
        const existingMember = session.members.find((m) => m.userId === userId);
        if (existingMember) {
          const existingMemberWithPictureUrl =
            await this.mapMemberPictureUrl(existingMember);

          return {
            ...session,
            creator: creatorWithPictureUrl,
            members: membersWithPictureUrl,
            memberCount: session.members.length,
            member: existingMemberWithPictureUrl,
            alreadyJoined: true,
          };
        }
      }

      // Guest must provide a nickname
      if (!userId && !existingGuestId && !nickname) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.NICKNAME_REQUIRED,
        });
      }

      // Check if returning guest
      if (!userId && existingGuestId) {
        const existingMember = session.members.find(
          (m) => m.guestId === existingGuestId,
        );
        if (existingMember) {
          const existingMemberWithPictureUrl =
            await this.mapMemberPictureUrl(existingMember);

          return {
            ...session,
            creator: creatorWithPictureUrl,
            members: membersWithPictureUrl,
            memberCount: session.members.length,
            member: existingMemberWithPictureUrl,
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

      const memberWithPictureUrl = await this.mapMemberPictureUrl(member);

      return {
        sessionId: session.sessionId,
        shareCode: session.shareCode,
        createdBy: session.createdBy,
        creator: creatorWithPictureUrl,
        createdAt: session.createdAt,
        status: session.status,
        memberCount: session.members.length + 1,
        members: [...membersWithPictureUrl, memberWithPictureUrl],
        member: memberWithPictureUrl,
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
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.SESSION_NOT_ACTIVE,
        });
      }

      const isMember = session.members.some((m) => m.userId === inviterId);
      if (!isMember) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_A_MEMBER,
        });
      }

      const friendship = await this.prismaService.friendship.findUnique({
        where: { userId_friendId: { userId: inviterId, friendId } },
      });
      if (!friendship) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.INVITE_FRIENDS_ONLY,
        });
      }

      const alreadyJoined = session.members.some((m) => m.userId === friendId);
      if (alreadyJoined) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: GroupSessionMessages.ALREADY_A_MEMBER,
        });
      }

      // Fetch inviter name for notification body
      const inviter = await this.prismaService.user.findUnique({
        where: { id: inviterId },
        select: { firstName: true, lastName: true },
      });
      const inviterName =
        [inviter?.firstName, inviter?.lastName].filter(Boolean).join(' ') ||
        'Someone';

      this.kafkaService.getClient().emit(NotificationTopics.Dispatch, {
        eventId: createId(),
        userId: friendId,
        type: NotificationType.GROUP_INVITE,
        title: 'Group Session Invite',
        body: `${inviterName} invited you to join a group session. Use code: ${session.shareCode}`,
        data: { sessionId, shareCode: session.shareCode, inviterId },
        preferredChannel: NotificationPreferredChannel.BOTH,
        createdAt: new Date().toISOString(),
      });

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
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      if (session.createdBy !== userId) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_SESSION_CREATOR,
        });
      }

      if (session.status === GroupSessionStatus.CLOSED) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.SESSION_ALREADY_CLOSED,
        });
      }

      return await this.prismaService.groupSession.update({
        where: { sessionId },
        data: { status: GroupSessionStatus.CLOSED, closeAt: null },
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
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.SESSION_NOT_ACTIVE,
        });
      }

      if (session.voteStatus === VoteStatus.FINALIZED) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.VOTE_ALREADY_FINALIZED,
        });
      }

      // Resolve member: by userId for authenticated users, by guestId for guests
      const member = await this.prismaService.groupSessionMember.findFirst({
        where: userId ? { userId, sessionId } : { guestId, sessionId },
      });

      if (!member) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_A_MEMBER,
        });
      }

      const vote = await this.prismaService.$transaction(async (prisma) => {
        const currentVote = await prisma.sessionVote.findUnique({
          where: { memberId: member.id },
        });

        if (currentVote?.isFinalized) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: GroupSessionMessages.VOTE_ALREADY_FINALIZED,
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

      // Notify all session members about the new/updated vote in real time
      void this.notifySessionMembers(sessionId, 'vote.cast', {
        sessionId,
        vote: {
          memberId: vote.member.id,
          userId: vote.member.userId,
          nickname: vote.member.nickname,
          place: vote.place,
        },
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
          message: GroupSessionMessages.PLACE_NOT_FOUND,
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
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.SESSION_NOT_ACTIVE,
        });
      }

      if (session.voteStatus === VoteStatus.FINALIZED) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.VOTE_ALREADY_FINALIZED,
        });
      }

      // Resolve member: by userId for authenticated users, by guestId for guests
      const member = userId
        ? session.members.find((m) => m.userId === userId)
        : session.members.find((m) => m.guestId === guestId);

      if (!member) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_A_MEMBER,
        });
      }

      const existingVote = await this.prismaService.sessionVote.findUnique({
        where: { memberId: member.id },
      });

      if (!existingVote) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.VOTE_REQUIRED_BEFORE_FINALIZE,
        });
      }

      if (existingVote.isFinalized) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.VOTE_ALREADY_FINALIZED,
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
        const autoVoteResults =
          this.groupSessionHelper.buildVoteResults(allVotes);
        const winningPlaceId = autoVoteResults[0]?.place?.id ?? null;
        const finalizedAt = new Date();
        const closeAt = this.buildAutoCloseAt(finalizedAt);

        await this.prismaService.groupSession.updateMany({
          where: { sessionId, voteStatus: VoteStatus.OPEN },
          data: {
            voteStatus: VoteStatus.FINALIZED,
            finalizedAt,
            closeAt,
            winningPlaceId,
          },
        });
        voteAutoFinalized = true;
      }

      // Notify all members: someone locked in their vote
      void this.notifySessionMembers(sessionId, 'vote.member_finalized', {
        sessionId,
        memberId: member.id,
        finalizedVotes,
        totalMembers,
        voteAutoFinalized,
      });

      // If auto-finalized, also send a push notification to all authenticated members
      if (voteAutoFinalized) {
        const members = await this.prismaService.groupSessionMember.findMany({
          where: { sessionId, userId: { not: null } },
          select: { userId: true },
        });
        const kafka = this.kafkaService.getClient();
        for (const m of members) {
          if (!m.userId) continue;
          kafka.emit(NotificationTopics.Dispatch, {
            eventId: createId(),
            userId: m.userId,
            type: NotificationType.GROUP_VOTE_FINALIZED,
            title: 'Vote Finalized!',
            body: 'All members have voted. Check out the results!',
            data: { sessionId },
            preferredChannel: NotificationPreferredChannel.BOTH,
            createdAt: new Date().toISOString(),
          });
        }
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
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      if (session.createdBy !== userId) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_SESSION_CREATOR,
        });
      }

      if (session.status !== GroupSessionStatus.ACTIVE) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.SESSION_NOT_ACTIVE,
        });
      }

      if (session.voteStatus === VoteStatus.FINALIZED) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: GroupSessionMessages.VOTE_ALREADY_FINALIZED,
        });
      }

      const voteResults = this.groupSessionHelper.buildVoteResults(
        await this.mapVotesMemberPictureUrl(session.votes),
      );
      const winningPlaceId = voteResults[0]?.place?.id ?? null;
      const finalizedAt = new Date();
      const closeAt = this.buildAutoCloseAt(finalizedAt);

      await this.prismaService.$transaction([
        this.prismaService.sessionVote.updateMany({
          where: { sessionId, isFinalized: false },
          data: { isFinalized: true },
        }),
        this.prismaService.groupSession.update({
          where: { sessionId },
          data: {
            voteStatus: VoteStatus.FINALIZED,
            finalizedAt,
            closeAt,
            winningPlaceId,
          },
        }),
      ]);

      // Notify all authenticated members with push notification
      const kafka = this.kafkaService.getClient();
      for (const m of session.members) {
        if (!m.userId) continue;
        kafka.emit(NotificationTopics.Dispatch, {
          eventId: createId(),
          userId: m.userId,
          type: NotificationType.GROUP_VOTE_FINALIZED,
          title: 'Vote Finalized!',
          body: 'The session host has finalized the vote. Check out the results!',
          data: { sessionId, winningPlaceId },
          preferredChannel: NotificationPreferredChannel.BOTH,
          createdAt: new Date().toISOString(),
        });
      }

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
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      const creatorWithPictureUrl = session.creator
        ? await this.mapUserPictureUrl(session.creator)
        : null;
      const membersWithPictureUrl = await this.mapMembersPictureUrl(
        session.members,
      );

      return {
        ...session,
        creator: creatorWithPictureUrl,
        members: membersWithPictureUrl,
      };
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
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      const membersWithPictureUrl = await this.mapMembersPictureUrl(
        session.members,
      );
      const votesWithPictureUrl = await this.mapVotesMemberPictureUrl(
        session.votes,
      );

      const voteResults =
        this.groupSessionHelper.buildVoteResults(votesWithPictureUrl);

      return {
        sessionId,
        voteStatus: session.voteStatus,
        totalMembers: membersWithPictureUrl.length,
        totalVotes: votesWithPictureUrl.length,
        finalizedCount: votesWithPictureUrl.filter((v) => v.isFinalized).length,
        votes: votesWithPictureUrl,
        results: voteResults,
      };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async getAll(userId: string) {
    try {
      return await this.prismaService.groupSession.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async autoCloseExpiredSessions() {
    const now = new Date();

    return await this.prismaService.groupSession.updateMany({
      where: {
        status: GroupSessionStatus.ACTIVE,
        voteStatus: VoteStatus.FINALIZED,
        closeAt: {
          lte: now,
        },
      },
      data: {
        status: GroupSessionStatus.CLOSED,
      },
    });
  }
}
