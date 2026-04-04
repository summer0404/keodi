import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { UpdateUserSettingDto } from 'src/shared/dtos/setting.dto';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';

@Injectable()
export class SettingService {
  constructor(private readonly prismaService: PrismaService) {}

  async get(userId: string) {
    try {
      const record = await this.prismaService.userSetting.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      const { userId: _, ...settings } = record;
      return settings;
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

      const record = await this.prismaService.userSetting.upsert({
        where: { userId },
        create: { userId, ...data },
        update: { ...data },
      });

      const { userId: _, ...settings } = record;
      return settings;
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
