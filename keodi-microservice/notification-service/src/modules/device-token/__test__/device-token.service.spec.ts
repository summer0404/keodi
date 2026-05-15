import { Test, TestingModule } from '@nestjs/testing';
import { DevicePlatform } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { FcmService } from 'src/providers/fcm/fcm.service';
import { DeviceTokenService } from '../device-token.service';

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  let prisma: {
    userDeviceToken: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let fcmService: jest.Mocked<FcmService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTokenService,
        {
          provide: PrismaService,
          useValue: {
            userDeviceToken: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: FcmService,
          useValue: {
            subscribeToTopic: jest.fn(),
            unsubscribeFromTopic: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DeviceTokenService>(DeviceTokenService);
    prisma = module.get(PrismaService);
    fcmService = module.get(FcmService);
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

      await expect(service.getActiveTokens('user-3')).rejects.toThrow(
        'db error',
      );
    });
  });

  // ---- upsertToken ----

  describe('upsertToken', () => {
    it('calls prisma.upsert with create and update payloads', async () => {
      prisma.userDeviceToken.upsert.mockResolvedValue(undefined);
      fcmService.subscribeToTopic.mockResolvedValue(undefined);

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

    it('subscribes the token to the user FCM topic after upsert', async () => {
      prisma.userDeviceToken.upsert.mockResolvedValue(undefined);
      fcmService.subscribeToTopic.mockResolvedValue(undefined);

      await service.upsertToken({
        userId: 'user-1',
        token: 'fcm-token',
        platform: DevicePlatform.ANDROID,
      });

      expect(fcmService.subscribeToTopic).toHaveBeenCalledWith(
        ['fcm-token'],
        'user-user-1',
      );
    });

    it('works without optional deviceId and appVersion', async () => {
      prisma.userDeviceToken.upsert.mockResolvedValue(undefined);
      fcmService.subscribeToTopic.mockResolvedValue(undefined);

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
      expect(fcmService.subscribeToTopic).toHaveBeenCalledWith(
        ['tok-ios'],
        'user-user-2',
      );
    });

    it('propagates Prisma errors before FCM subscribe', async () => {
      prisma.userDeviceToken.upsert.mockRejectedValue(
        new Error('upsert failed'),
      );

      await expect(
        service.upsertToken({
          userId: 'u',
          token: 't',
          platform: DevicePlatform.ANDROID,
        }),
      ).rejects.toThrow('upsert failed');

      expect(fcmService.subscribeToTopic).not.toHaveBeenCalled();
    });
  });

  // ---- deactivateToken ----

  describe('deactivateToken', () => {
    it('sets isActive false for the given token', async () => {
      prisma.userDeviceToken.update.mockResolvedValue(undefined);
      fcmService.unsubscribeFromTopic.mockResolvedValue(undefined);

      await service.deactivateToken({ token: 'bad-token', userId: 'user-1' });

      expect(prisma.userDeviceToken.update).toHaveBeenCalledWith({
        where: { token: 'bad-token' },
        data: { isActive: false },
      });
    });

    it('unsubscribes the token from the user FCM topic when userId is provided', async () => {
      prisma.userDeviceToken.update.mockResolvedValue(undefined);
      fcmService.unsubscribeFromTopic.mockResolvedValue(undefined);

      await service.deactivateToken({ token: 'bad-token', userId: 'user-1' });

      expect(fcmService.unsubscribeFromTopic).toHaveBeenCalledWith(
        ['bad-token'],
        'user-user-1',
      );
      expect(prisma.userDeviceToken.findUnique).not.toHaveBeenCalled();
    });

    it('falls back to a DB lookup when userId is not provided', async () => {
      prisma.userDeviceToken.findUnique.mockResolvedValue({ userId: 'user-2' });
      prisma.userDeviceToken.update.mockResolvedValue(undefined);
      fcmService.unsubscribeFromTopic.mockResolvedValue(undefined);

      await service.deactivateToken({ token: 'orphan-token' });

      expect(prisma.userDeviceToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'orphan-token' },
        select: { userId: true },
      });
      expect(fcmService.unsubscribeFromTopic).toHaveBeenCalledWith(
        ['orphan-token'],
        'user-user-2',
      );
    });

    it('skips FCM unsubscribe when DB lookup returns no record', async () => {
      prisma.userDeviceToken.findUnique.mockResolvedValue(null);
      prisma.userDeviceToken.update.mockResolvedValue(undefined);

      await service.deactivateToken({ token: 'ghost-token' });

      expect(fcmService.unsubscribeFromTopic).not.toHaveBeenCalled();
    });

    it('propagates Prisma update errors', async () => {
      prisma.userDeviceToken.update.mockRejectedValue(
        new Error('update failed'),
      );

      await expect(
        service.deactivateToken({ token: 'tok-x', userId: 'user-1' }),
      ).rejects.toThrow('update failed');
    });
  });
});
