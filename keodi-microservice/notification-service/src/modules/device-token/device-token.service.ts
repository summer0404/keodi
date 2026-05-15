import { Injectable } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { FCM_TOPIC_ALL, fcmUserTopic } from 'src/shared/constants/fcm.constant';

@Injectable()
export class DeviceTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  async getActiveTokens(userId: string): Promise<string[]> {
    const records = await this.prisma.userDeviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });
    return records.map((r) => r.token);
  }

  async upsertToken(payload: {
    userId: string;
    token: string;
    platform: DevicePlatform;
    deviceId?: string;
    appVersion?: string;
  }): Promise<void> {
    await this.prisma.userDeviceToken.upsert({
      where: { token: payload.token },
      create: {
        userId: payload.userId,
        token: payload.token,
        platform: payload.platform,
        deviceId: payload.deviceId,
        appVersion: payload.appVersion,
        isActive: true,
      },
      update: {
        userId: payload.userId,
        token: payload.token,
        platform: payload.platform,
        deviceId: payload.deviceId,
        appVersion: payload.appVersion,
        isActive: true,
        updatedAt: new Date(),
      },
    });
    await Promise.all([
      this.fcmService.subscribeToTopic(
        [payload.token],
        fcmUserTopic(payload.userId),
      ),
      this.fcmService.subscribeToTopic([payload.token], FCM_TOPIC_ALL),
    ]);
  }

  async deactivateToken(payload: {
    token: string;
    userId?: string;
  }): Promise<void> {
    const userId =
      payload.userId ??
      (
        await this.prisma.userDeviceToken.findUnique({
          where: { token: payload.token },
          select: { userId: true },
        })
      )?.userId;

    await this.prisma.userDeviceToken.update({
      where: { token: payload.token },
      data: { isActive: false },
    });

    await Promise.all([
      userId
        ? this.fcmService.unsubscribeFromTopic(
            [payload.token],
            fcmUserTopic(userId),
          )
        : Promise.resolve(),
      this.fcmService.unsubscribeFromTopic([payload.token], FCM_TOPIC_ALL),
    ]);
  }
}
