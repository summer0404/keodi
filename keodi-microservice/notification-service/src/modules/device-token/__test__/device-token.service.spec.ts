import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTokenService } from '../device-token.service';
import { PrismaService } from 'src/database/prisma.service';
import { DevicePlatform } from '@prisma/client';

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  let prisma: {
    userDeviceToken: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTokenService,
        {
          provide: PrismaService,
          useValue: {
            userDeviceToken: {
              findMany: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DeviceTokenService>(DeviceTokenService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- getActiveTokens ----

  describe('getActiveTokens', () => {
    it('returns an array of token strings for active records', async () => {
      prisma.userDeviceToken.findMany.mockResolvedValue([
        { token: 'tok-1' },
        { token: 'tok-2' },
      ]);

      const result = await service.getActiveTokens('user-1');

      expect(prisma.userDeviceToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        select: { token: true },
      });
      expect(result).toEqual(['tok-1', 'tok-2']);
    });

    it('returns an empty array when no active tokens exist', async () => {
      prisma.userDeviceToken.findMany.mockResolvedValue([]);

      const result = await service.getActiveTokens('user-2');

      expect(result).toEqual([]);
    });

    it('propagates Prisma errors', async () => {
      prisma.userDeviceToken.findMany.mockRejectedValue(new Error('db error'));

      await expect(service.getActiveTokens('user-3')).rejects.toThrow('db error');
    });
  });

  // ---- upsertToken ----

  describe('upsertToken', () => {
    it('calls prisma.upsert with create and update payloads', async () => {
      prisma.userDeviceToken.upsert.mockResolvedValue(undefined);

      const payload = {
        userId: 'user-1',
        token: 'fcm-token',
        platform: DevicePlatform.ANDROID,
        deviceId: 'device-abc',
        appVersion: '1.0.0',
      };

      await service.upsertToken(payload);

      expect(prisma.userDeviceToken.upsert).toHaveBeenCalledWith({
        where: { token: 'fcm-token' },
        create: {
          userId: 'user-1',
          token: 'fcm-token',
          platform: DevicePlatform.ANDROID,
          deviceId: 'device-abc',
          appVersion: '1.0.0',
          isActive: true,
        },
        update: expect.objectContaining({
          userId: 'user-1',
          token: 'fcm-token',
          isActive: true,
        }),
      });
    });

    it('works without optional deviceId and appVersion', async () => {
      prisma.userDeviceToken.upsert.mockResolvedValue(undefined);

      await service.upsertToken({
        userId: 'user-2',
        token: 'tok-ios',
        platform: DevicePlatform.IOS,
      });

      expect(prisma.userDeviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ platform: DevicePlatform.IOS }),
        }),
      );
    });

    it('propagates Prisma errors', async () => {
      prisma.userDeviceToken.upsert.mockRejectedValue(new Error('upsert failed'));

      await expect(
        service.upsertToken({ userId: 'u', token: 't', platform: DevicePlatform.ANDROID }),
      ).rejects.toThrow('upsert failed');
    });
  });

  // ---- deactivateToken ----

  describe('deactivateToken', () => {
    it('calls prisma.update to set isActive false for the given token', async () => {
      prisma.userDeviceToken.update.mockResolvedValue(undefined);

      await service.deactivateToken('bad-token');

      expect(prisma.userDeviceToken.update).toHaveBeenCalledWith({
        where: { token: 'bad-token' },
        data: { isActive: false },
      });
    });

    it('propagates Prisma errors', async () => {
      prisma.userDeviceToken.update.mockRejectedValue(new Error('update failed'));

      await expect(service.deactivateToken('tok-x')).rejects.toThrow('update failed');
    });
  });
});
