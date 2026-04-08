import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { FriendRequestStatus, Prisma, ProfileVisibility } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from 'src/modules/image/image.service';
import { RedisService } from 'src/providers/redis/redis.service';
import {
  CreateUserDto,
  SearchOthersDto,
  SyncUsernameDto,
  UpdateUserProfileDto,
} from 'src/shared/dtos/user.dto';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';

@Injectable()
export class UserService {
  private static readonly USER_LOCATIONS_KEY = 'user:locations';

  constructor(
    private readonly prismaService: PrismaService,
    private readonly imageService: ImageService,
    private readonly redisService: RedisService,
  ) {}

  async searchOthers(dto: SearchOthersDto) {
    const { userId, keyword, limit, page } = dto;
    try {
      if (!keyword) return { users: [], total: 0, page, totalPages: 0, limit };

      const offset = (page - 1) * limit;
      const tokens = keyword.split(/\s+/).filter(Boolean);
      const keywordPattern = `%${keyword}%`;

      const searchTarget = Prisma.sql`
      unaccent(lower(concat_ws(' ', u.first_name, u.last_name, u.username)))
    `;

      const tokenConditions = tokens.map((token) => {
        return Prisma.sql`${searchTarget} LIKE unaccent(${`%${token}%`})`;
      });

      const whereClause = Prisma.sql`
        u.id <> ${userId}
        AND (
          ${searchTarget} LIKE unaccent(${keywordPattern})
          ${
            tokenConditions.length
              ? Prisma.sql`OR (${Prisma.join(tokenConditions, ' AND ')})`
              : Prisma.empty
          }
        )
      `;

      const [countResult, rawUsers] = await Promise.all([
        this.prismaService.$queryRaw<[{ count: bigint }]>(
          Prisma.sql`SELECT COUNT(*) as count FROM users u WHERE ${whereClause}`,
        ),
        this.prismaService.$queryRaw<
          {
            id: string;
            username: string | null;
            firstName: string | null;
            lastName: string | null;
            pictureUrl: string | null;
          }[]
        >(Prisma.sql`
          SELECT
            u.id,
            u.username,
            u.first_name AS "firstName",
            u.last_name AS "lastName",
            u.picture_url AS "pictureUrl"
          FROM users u
          WHERE ${whereClause}
          ORDER BY u.first_name ASC NULLS LAST, u.last_name ASC NULLS LAST
          LIMIT ${limit}
          OFFSET ${offset}
        `),
      ]);

      const total = Number(countResult[0].count);
      const totalPages = Math.ceil(total / limit);

      const users = await Promise.all(
        rawUsers.map(async (user) => ({
          ...user,
          pictureUrl: user.pictureUrl
            ? await this.imageService.getImageViewUrl(user.pictureUrl)
            : null,
        })),
      );

      return { users, total, page, totalPages, limit };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getAll() {
    try {
      const users = await this.prismaService.user.findMany({
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          pictureUrl: true,
        },
      });

      return await Promise.all(
        users.map(async (user) => ({
          ...user,
          pictureUrl: user.pictureUrl
            ? await this.imageService.getImageViewUrl(user.pictureUrl)
            : null,
        })),
      );
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async create(createUserDto: CreateUserDto) {
    const { userId, username, firstName, lastName, picture } = createUserDto;
    try {
      await this.prismaService.user.create({
        data: {
          id: userId,
          username,
          firstName,
          lastName,
          pictureUrl: picture,
        },
      });
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updatePicture(file: Buffer, userId: string, type?: string) {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User not found',
        });

      const image = await this.imageService.updateUserProfilePicture(
        existingUser.id,
        file,
        type,
      );

      if (!existingUser.pictureUrl || existingUser.pictureUrl !== image.url) {
        await this.prismaService.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            pictureUrl: image.url,
          },
        });
      }

      return { message: 'Profile picture updated successfully' };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getById(userId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });
      if (!user)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User not found',
        });

      const pictureUrl = user.pictureUrl
        ? await this.imageService.getImageViewUrl(user.pictureUrl)
        : null;

      return {
        ...user,
        pictureUrl,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getOtherProfile(viewerId: string, targetUserId: string) {
    try {
      const targetUser = await this.prismaService.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          dateOfBirth: true,
          pictureUrl: true,
        },
      });

      if (!targetUser) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'USER_NOT_FOUND',
        });
      }

      const isSelf = viewerId === targetUserId;

      const [targetSetting, friendship, pendingRequest] = await Promise.all([
        this.prismaService.userSetting.upsert({
          where: { userId: targetUserId },
          create: { userId: targetUserId },
          update: {},
          select: { profileVisibility: true },
        }),
        isSelf
          ? Promise.resolve(null)
          : this.prismaService.friendship.findUnique({
              where: {
                userId_friendId: {
                  userId: viewerId,
                  friendId: targetUserId,
                },
              },
              select: { userId: true },
            }),
        isSelf
          ? Promise.resolve(null)
          : this.prismaService.friendRequest.findFirst({
              where: {
                status: FriendRequestStatus.PENDING,
                OR: [
                  { senderId: viewerId, receiverId: targetUserId },
                  { senderId: targetUserId, receiverId: viewerId },
                ],
              },
              select: { id: true },
            }),
      ]);

      const isFriend = !!friendship;
      const hasPendingRequest = !!pendingRequest;

      const canViewFullProfile =
        isSelf ||
        targetSetting.profileVisibility === ProfileVisibility.PUBLIC ||
        (targetSetting.profileVisibility === ProfileVisibility.FRIENDS_ONLY &&
          isFriend);

      const canSendFriendRequest = !isSelf && !isFriend && !hasPendingRequest;

      const pictureUrl = targetUser.pictureUrl
        ? await this.imageService.getImageViewUrl(targetUser.pictureUrl)
        : null;

      const visibleProfileFields = canViewFullProfile
        ? {
            phoneNumber: targetUser.phoneNumber,
            dateOfBirth: targetUser.dateOfBirth,
          }
        : {
            phoneNumber: null,
            dateOfBirth: null,
          };

      return {
        ...targetUser,
        pictureUrl,
        ...visibleProfileFields,
        profileVisibility: targetSetting.profileVisibility,
        isProfileVisible: canViewFullProfile,
        isFriend,
        hasPendingRequest,
        canSendFriendRequest,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updateProfile(userId: string, data: UpdateUserProfileDto) {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });
      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User not found',
        });

      if (data.phoneNumber) {
        const userWithPhoneNumber = await this.prismaService.user.findUnique({
          where: { phoneNumber: data.phoneNumber },
        });

        if (userWithPhoneNumber && userWithPhoneNumber.id !== existingUser.id) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Phone number already in use',
          });
        }
      }

      await this.prismaService.user.update({
        where: {
          id: existingUser.id,
        },
        data: data,
      });
      return { message: 'Profile updated successfully' };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async onBoarding(userId: string, categoryIds: string[]) {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User not found',
        });

      await this.prismaService.userCategory.createMany({
        data: categoryIds.map((categoryId) => ({
          userId: existingUser.id,
          categoryId,
          isOnboardSelected: true,
        })),
        skipDuplicates: true,
      });

      return { message: 'Onboarding completed successfully' };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    await this.redisService.hSet(
      UserService.USER_LOCATIONS_KEY,
      userId,
      JSON.stringify({
        lat: latitude,
        lng: longitude,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  async syncUsername(syncUsernameDto: SyncUsernameDto) {
    const { userId, username } = syncUsernameDto;
    try {
      await this.prismaService.user.upsert({
        where: { id: userId },
        create: { id: userId, username },
        update: { username },
      });
      return { message: 'USERNAME_SYNCED' };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
