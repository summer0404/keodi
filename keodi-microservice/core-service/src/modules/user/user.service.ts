import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  FriendRequestStatus,
  Prisma,
  ProfileVisibility,
  UserImageType,
} from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from 'src/modules/image/image.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { UserErrorMessages } from 'src/shared/constants/error.constant';
import { RedisKeys } from 'src/shared/constants/redis.constant';
import {
  CreateUserDto,
  SearchOthersDto,
  SyncUsernameDto,
  UpdateUserProfileDto,
} from 'src/shared/dtos/user.dto';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly imageService: ImageService,
    private readonly redisService: RedisService,
  ) {}

  async searchOthers(dto: SearchOthersDto) {
    const { userId, keyword, limit, page } = dto;
    try {
      const normalizedKeyword = keyword?.trim();
      if (!normalizedKeyword)
        return { users: [], total: 0, page, totalPages: 0, limit };

      const offset = (page - 1) * limit;
      const likePattern = `%${normalizedKeyword}%`;

      const rawUsers = await this.prismaService.$queryRaw<
        {
          id: string;
          username: string | null;
          firstName: string | null;
          lastName: string | null;
          pictureUrl: string | null;
          totalCount: bigint;
        }[]
      >(Prisma.sql`
        SELECT
          u.id,
          u.username,
          u.first_name AS "firstName",
          u.last_name AS "lastName",
          u.picture_url AS "pictureUrl",
          COUNT(*) OVER() AS "totalCount"
        FROM users u
        WHERE u.id <> ${userId}
          AND (
            f_unaccent(u.username) ILIKE f_unaccent(${likePattern})
            OR f_unaccent(u.first_name) ILIKE f_unaccent(${likePattern})
            OR f_unaccent(u.last_name) ILIKE f_unaccent(${likePattern})
            OR f_unaccent(CONCAT(u.first_name, ' ', u.last_name)) ILIKE f_unaccent(${likePattern})
          )
        ORDER BY
          u.first_name ASC NULLS LAST,
          u.last_name ASC NULLS LAST
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      const total = rawUsers.length > 0 ? Number(rawUsers[0].totalCount) : 0;
      const totalPages = Math.ceil(total / limit);

      const users = await Promise.all(
        rawUsers.map(async ({ totalCount, ...user }) => ({
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

  async delete(userId: string) {
    try {
      await this.prismaService.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async updatePicture(key: string, userId: string) {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: UserErrorMessages.USER_NOT_FOUND,
        });

      const existingPicture = await this.prismaService.userImage.findFirst({
        where: {
          userId: existingUser.id,
          type: UserImageType.PICTURE,
        },
        select: {
          imageId: true,
        },
      });
      const image = await this.imageService.persistImageRecord(
        key,
        existingPicture?.imageId,
      );

      if (!existingPicture) {
        await this.prismaService.userImage.create({
          data: {
            userId: existingUser.id,
            imageId: image.id,
            type: UserImageType.PICTURE,
          },
        });
      }

      if (!existingUser.pictureUrl || existingUser.pictureUrl !== image.key) {
        await this.prismaService.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            pictureUrl: image.key,
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
          message: UserErrorMessages.USER_NOT_FOUND,
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
          message: UserErrorMessages.USER_NOT_FOUND,
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
        pendingRequestId: pendingRequest?.id ?? null,
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
          message: UserErrorMessages.USER_NOT_FOUND,
        });

      if (data.phoneNumber) {
        const userWithPhoneNumber = await this.prismaService.user.findUnique({
          where: { phoneNumber: data.phoneNumber },
        });

        if (userWithPhoneNumber && userWithPhoneNumber.id !== existingUser.id) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: UserErrorMessages.PHONE_NUMBER_ALREADY_IN_USE,
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
          message: UserErrorMessages.USER_NOT_FOUND,
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
      RedisKeys.USER_LOCATIONS,
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
