import { Injectable } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class DeviceTokenService {
  constructor(private readonly prisma: PrismaService) {}

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
  }

  async deactivateToken(token: string): Promise<void> {
    await this.prisma.userDeviceToken.update({
      where: { token },
      data: { isActive: false },
    });
  }
}
