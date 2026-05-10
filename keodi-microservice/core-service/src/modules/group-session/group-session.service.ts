import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { createId } from '@paralleldrive/cuid2';
import {
  GroupSessionActivityType,
  GroupSessionStatus,
  Prisma,
  VoteStatus,
  type GroupSession,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  GROUP_SESSION_DEFAULT_AUTO_CLOSE_DELAY_MINUTES,
  GROUP_SESSION_MAX_CATEGORY_COUNT,
  GROUP_SESSION_MAX_SEARCH_RADIUS_KM,
  GROUP_SESSION_MIN_SEARCH_RADIUS_KM,
  GROUP_SESSION_SHARE_CODE_LENGTH,
  GroupSessionMessages,
} from 'src/shared/constants/group-session.constant';
import { NotificationTopics } from 'src/shared/constants/topic.constant';
import {
  NotificationPreferredChannel,
  NotificationType,
} from 'src/shared/enums/notification.enum';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';
import {
  GetSessionActivitiesDto,
  LogRecommendationsRefreshedDto,
} from 'src/shared/dtos/group-session.dto';
import { ActivityActor } from 'src/shared/interfaces/group-session.interface';
import { ImageService } from '../image/image.service';
import { GroupSessionHelper } from './group-session.helper';

@Injectable()
export class GroupSessionService {
  private readonly logger = new Logger(GroupSessionService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly groupSessionHelper: GroupSessionHelper,
    private readonly kafkaService: KafkaService,
    private readonly imageService: ImageService,
  ) {}

  private async logActivity(
    sessionId: string,
    type: GroupSessionActivityType,
    actor?: ActivityActor | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      const actorId = actor?.userId ?? null;
      let actorName: string | null = actor?.nickname ?? null;

      if (!actorName && actor?.user) {
        actorName =
          `${actor.user.lastName ?? ''} ${actor.user.firstName ?? ''}`.trim() || null;
      }

      if (!actorName && actorId) {
        const user = await this.prismaService.user.findUnique({
          where: { id: actorId },
          select: { firstName: true, lastName: true },
        });
        actorName = user
          ? `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || null
          : null;
      }

      await this.prismaService.groupSessionActivity.create({
        data: {
          sessionId,
          type,
          actorId,
          actorName,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.error('Failed to log group session activity', err);
    }
  }

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

  private async assertGroupSessionIsActive(sessionId: string): Promise<void> {
    const session = await this.prismaService.groupSession.findUnique({
      where: { sessionId },
      select: { status: true },
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
  }

  private async assertGroupSessionMember(params: {
    sessionId: string;
    userId?: string;
    guestId?: string;
  }): Promise<void> {
    const { sessionId, userId, guestId } = params;

    if (!userId && !guestId) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: GroupSessionMessages.NOT_A_MEMBER,
      });
    }

    const member = await this.prismaService.groupSessionMember.findFirst({
      where: userId ? { userId, sessionId } : { guestId, sessionId },
      select: { id: true },
    });

    if (!member) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: GroupSessionMessages.NOT_A_MEMBER,
      });
    }
  }

  private assertRecommendationSearchRadius(searchRadius: number): void {
    if (
      typeof searchRadius !== 'number' ||
      !Number.isFinite(searchRadius) ||
      searchRadius < GROUP_SESSION_MIN_SEARCH_RADIUS_KM ||
      searchRadius > GROUP_SESSION_MAX_SEARCH_RADIUS_KM
    ) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: GroupSessionMessages.INVALID_SEARCH_RADIUS,
      });
    }
  }

  private async validateRecommendationCategoryIds(
    categoryIds: string[],
  ): Promise<string[]> {
    if (!Array.isArray(categoryIds)) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: GroupSessionMessages.CATEGORY_NOT_FOUND,
      });
    }

    const normalizedCategoryIds = categoryIds
      .filter(
        (categoryId): categoryId is string => typeof categoryId === 'string',
      )
      .map((categoryId) => categoryId.trim())
      .filter((categoryId) => categoryId.length > 0);

    if (normalizedCategoryIds.length !== categoryIds.length) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: GroupSessionMessages.CATEGORY_NOT_FOUND,
      });
    }

    const uniqueCategoryIds = Array.from(new Set(normalizedCategoryIds));

    if (uniqueCategoryIds.length > GROUP_SESSION_MAX_CATEGORY_COUNT) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: GroupSessionMessages.CATEGORY_LIMIT_EXCEEDED,
      });
    }

    if (uniqueCategoryIds.length === 0) {
      return [];
    }

    const existingCategoryCount = await this.prismaService.category.count({
      where: { id: { in: uniqueCategoryIds } },
    });

    if (existingCategoryCount !== uniqueCategoryIds.length) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: GroupSessionMessages.CATEGORY_NOT_FOUND,
      });
    }

    return uniqueCategoryIds;
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
                  username: true,
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
              username: true,
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
              username: true,
              firstName: true,
              lastName: true,
              pictureUrl: true,
            },
          },
        },
      });

      const memberWithPictureUrl = await this.mapMemberPictureUrl(member);

      void this.notifySessionMembers(
        session.sessionId,
        'session.member_joined',
        {
          sessionId: session.sessionId,
          member: memberWithPictureUrl as unknown as Record<string, unknown>,
        },
      );

      void this.logActivity(session.sessionId, GroupSessionActivityType.MEMBER_JOINED, member, { isGuest: !member.userId });

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

      // Fetch inviter info for notification
      const inviter = await this.prismaService.user.findUnique({
        where: { id: inviterId },
        select: { firstName: true, lastName: true, pictureUrl: true },
      });
      const inviterName =
        [inviter?.firstName, inviter?.lastName].filter(Boolean).join(' ') ||
        'Someone';
      const inviterPictureUrl = inviter?.pictureUrl
        ? await this.imageService.getImageViewUrl(inviter.pictureUrl)
        : null;

      this.kafkaService.getClient().emit(NotificationTopics.Dispatch, {
        eventId: createId(),
        userId: friendId,
        type: NotificationType.GROUP_INVITE,
        title: 'Group Session Invite',
        body: `${inviterName} invited you to join a group session. Use code: ${session.shareCode}`,
        data: {
          sessionId,
          shareCode: session.shareCode,
          inviterId,
          inviterName,
          inviterPictureUrl,
        },
        deepLink: `frontend://group?shareCode=${session.shareCode}`,
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

      const updatedSession = await this.prismaService.groupSession.update({
        where: { sessionId },
        data: { status: GroupSessionStatus.CLOSED, closeAt: null },
      });

      void this.notifySessionMembers(sessionId, 'session.closed', {
        sessionId,
      });

      void this.logActivity(sessionId, GroupSessionActivityType.SESSION_CLOSED, { userId }, null);

      return updatedSession;
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
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    pictureUrl: true,
                  },
                },
              },
            },
          },
        });
      });

      const memberWithPictureUrl = await this.mapMemberPictureUrl(vote.member);

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

      return {
        ...vote,
        member: memberWithPictureUrl,
      };
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
            deepLink: `frontend://group/session/${sessionId}/results`,
            preferredChannel: NotificationPreferredChannel.BOTH,
            createdAt: new Date().toISOString(),
          });
        }
      }

      void this.logActivity(
        sessionId,
        GroupSessionActivityType.VOTE_FINALIZED,
        member,
        { placeId: updatedVote.placeId, placeName: updatedVote.place?.name ?? null },
      );

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
                      username: true,
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
          deepLink: `frontend://group/session/${sessionId}/results`,
          preferredChannel: NotificationPreferredChannel.BOTH,
          createdAt: new Date().toISOString(),
        });
      }

      void this.notifySessionMembers(sessionId, 'vote.session_finalized', {
        sessionId,
        winningPlaceId,
      });

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
              username: true,
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
                  username: true,
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
                  username: true,
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
                      username: true,
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

  async getAll(userId: string, page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        this.prismaService.groupSession.findMany({
          where: {
            members: {
              some: { userId },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          include: {
            _count: { select: { members: true } },
            members: {
              take: 4,
              select: {
                id: true,
                userId: true,
                guestId: true,
                nickname: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    pictureUrl: true,
                  },
                },
              },
            },
          },
        }),
        this.prismaService.groupSession.count({
          where: {
            members: {
              some: { userId },
            },
          },
        }),
      ]);

      return {
        sessions: await Promise.all(
          sessions.map(async (session) => ({
            ...session,
            memberCount: session._count.members,
            members: await this.mapMembersPictureUrl(session.members),
          })),
        ),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async updateRecommendationSearchRadius(data: {
    sessionId: string;
    searchRadius: number;
    userId?: string;
    guestId?: string;
  }) {
    try {
      const { sessionId, searchRadius, userId, guestId } = data;

      this.assertRecommendationSearchRadius(searchRadius);
      await this.assertGroupSessionIsActive(sessionId);
      await this.assertGroupSessionMember({ sessionId, userId, guestId });

      const updatedSession = await this.prismaService.groupSession.update({
        where: { sessionId },
        data: { searchRadius },
        select: {
          sessionId: true,
          searchRadius: true,
        },
      });

      return updatedSession;
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async updateRecommendationCategories(data: {
    sessionId: string;
    categoryIds: string[];
    userId?: string;
    guestId?: string;
  }) {
    try {
      const { sessionId, categoryIds, userId, guestId } = data;

      await this.assertGroupSessionIsActive(sessionId);
      await this.assertGroupSessionMember({ sessionId, userId, guestId });

      const validCategoryIds =
        await this.validateRecommendationCategoryIds(categoryIds);

      await this.prismaService.$transaction(async (prisma) => {
        await prisma.groupSessionCategory.deleteMany({
          where: { sessionId },
        });

        if (validCategoryIds.length > 0) {
          await prisma.groupSessionCategory.createMany({
            data: validCategoryIds.map((categoryId) => ({
              sessionId,
              categoryId,
            })),
          });
        }
      });

      void this.logActivity(
        sessionId,
        GroupSessionActivityType.CATEGORIES_UPDATED,
        { userId: userId ?? null },
        { categoryIds: validCategoryIds },
      );

      return {
        sessionId,
        categoryIds: validCategoryIds,
      };
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

  async addCandidate(data: {
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

      const member = await this.prismaService.groupSessionMember.findFirst({
        where: userId ? { userId, sessionId } : { guestId, sessionId },
      });

      if (!member) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_A_MEMBER,
        });
      }

      try {
        const existingCandidate =
          await this.prismaService.groupSessionCandidate.findUnique({
            where: { sessionId_placeId: { sessionId, placeId } },
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

        if (existingCandidate) {
          return existingCandidate;
        }

        const candidate = await this.prismaService.groupSessionCandidate.create(
          {
            data: {
              sessionId,
              placeId,
              addedBy: member.id,
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
            },
          },
        );

        void this.notifySessionMembers(sessionId, 'candidate.added', {
          sessionId,
          candidate: {
            placeId: candidate.placeId,
            place: candidate.place,
            addedBy: member.id,
          },
        });

        return candidate;
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
        throw error;
      }
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async deleteCandidate(data: {
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

      const member = await this.prismaService.groupSessionMember.findFirst({
        where: userId ? { userId, sessionId } : { guestId, sessionId },
      });

      if (!member) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_A_MEMBER,
        });
      }

      const candidate =
        await this.prismaService.groupSessionCandidate.findUnique({
          where: { sessionId_placeId: { sessionId, placeId } },
        });

      if (!candidate) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: GroupSessionMessages.CANDIDATE_NOT_FOUND,
        });
      }

      if (candidate.addedBy !== member.id) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_CANDIDATE_OWNER,
        });
      }

      await this.prismaService.groupSessionCandidate.delete({
        where: { sessionId_placeId: { sessionId, placeId } },
      });

      void this.notifySessionMembers(sessionId, 'candidate.removed', {
        sessionId,
        candidate: {
          placeId,
          removedBy: member.id,
        },
      });

      return { sessionId, placeId };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async leaveSession(data: {
    sessionId: string;
    userId?: string;
    guestId?: string;
  }) {
    try {
      const { sessionId, userId, guestId } = data;

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

      if (userId && session.createdBy === userId) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.CANNOT_LEAVE_AS_CREATOR,
        });
      }

      const member = await this.prismaService.groupSessionMember.findFirst({
        where: userId ? { userId, sessionId } : { guestId, sessionId },
        include: { user: { select: { firstName: true, lastName: true } } },
      });

      if (!member) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: GroupSessionMessages.NOT_A_MEMBER,
        });
      }

      await this.prismaService.groupSessionMember.delete({
        where: { id: member.id },
      });

      void this.notifySessionMembers(sessionId, 'session.member_left', {
        sessionId,
        memberId: member.id,
        userId: member.userId,
      });

      void this.logActivity(sessionId, GroupSessionActivityType.MEMBER_LEFT, member, { isGuest: !member.userId });

      return { sessionId, memberId: member.id };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async getCandidates(sessionId: string) {
    try {
      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      const candidates =
        await this.prismaService.groupSessionCandidate.findMany({
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
              select: {
                id: true,
                userId: true,
                guestId: true,
                nickname: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    pictureUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

      const candidatesWithPictureUrl = await Promise.all(
        candidates.map(async (c) => ({
          ...c,
          member: await this.mapMemberPictureUrl(c.member),
        })),
      );

      return {
        sessionId,
        candidates: candidatesWithPictureUrl,
        total: candidatesWithPictureUrl.length,
      };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async getActivities(dto: GetSessionActivitiesDto) {
    const { sessionId, userId, guestId } = dto;
    try {
      const session = await this.prismaService.groupSession.findUnique({
        where: { sessionId },
        include: { members: { select: { userId: true, guestId: true } } },
      });

      if (!session) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: GroupSessionMessages.SESSION_NOT_FOUND,
        });
      }

      const isMember = userId
        ? session.members.some((m) => m.userId === userId) || session.createdBy === userId
        : session.members.some((m) => m.guestId === guestId);

      if (!isMember) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: GroupSessionMessages.NOT_A_MEMBER,
        });
      }

      const activities = await this.prismaService.groupSessionActivity.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });

      return { activities };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async logRecommendationsRefreshed(dto: LogRecommendationsRefreshedDto) {
    const { sessionId, userId } = dto;
    void this.logActivity(sessionId, GroupSessionActivityType.RECOMMENDATIONS_REFRESHED, { userId: userId ?? null }, null);
  }
}
