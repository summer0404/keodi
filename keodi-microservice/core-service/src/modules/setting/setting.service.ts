import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { DEFAULT_USER_SETTINGS } from 'src/shared/constants/setting.constant';
import { UpdateUserSettingDto } from 'src/shared/dtos/setting.dto';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';

@Injectable()
export class SettingService {
  constructor(private readonly prismaService: PrismaService) {}

  async get(userId: string) {
    try {
      const record = await this.prismaService.userSetting.findUnique({
        where: { userId },
      });

      return {
        ...DEFAULT_USER_SETTINGS,
        ...((record?.settings as object) ?? {}),
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async update(userId: string, data: UpdateUserSettingDto) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'USER_NOT_FOUND',
        });
      }

      const current = await this.get(userId);
      const merged = { ...current, ...data };

      await this.prismaService.userSetting.upsert({
        where: { userId },
        create: { userId, settings: merged },
        update: { settings: merged },
      });

      return merged;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
