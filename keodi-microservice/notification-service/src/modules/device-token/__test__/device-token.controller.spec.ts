import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTokenController } from '../device-token.controller';
import { DeviceTokenService } from '../device-token.service';
import { DevicePlatform } from '@prisma/client';

describe('DeviceTokenController', () => {
  let controller: DeviceTokenController;
  let service: jest.Mocked<DeviceTokenService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceTokenController],
      providers: [
        {
          provide: DeviceTokenService,
          useValue: {
            getActiveTokens: jest.fn(),
            upsertToken: jest.fn(),
            deactivateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DeviceTokenController>(DeviceTokenController);
    service = module.get(DeviceTokenService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- getActive ----

  describe('getActive', () => {
    it('returns userId and tokens from service', async () => {
      service.getActiveTokens.mockResolvedValue(['tok-1', 'tok-2']);

      const result = await controller.getActive({ userId: 'user-1' });

      expect(service.getActiveTokens).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ userId: 'user-1', tokens: ['tok-1', 'tok-2'] });
    });

    it('returns empty tokens array when no active tokens exist', async () => {
      service.getActiveTokens.mockResolvedValue([]);

      const result = await controller.getActive({ userId: 'user-2' });

      expect(result).toEqual({ userId: 'user-2', tokens: [] });
    });

    it('propagates service errors', async () => {
      service.getActiveTokens.mockRejectedValue(new Error('service error'));

      await expect(controller.getActive({ userId: 'user-3' })).rejects.toThrow('service error');
    });
  });

  // ---- upsert ----

  describe('upsert', () => {
    it('delegates to service.upsertToken with all fields', async () => {
      service.upsertToken.mockResolvedValue(undefined);

      const payload = {
        userId: 'user-1',
        token: 'fcm-token',
        platform: DevicePlatform.ANDROID,
        deviceId: 'device-1',
        appVersion: '2.0.0',
      };

      await controller.upsert(payload);

      expect(service.upsertToken).toHaveBeenCalledWith(payload);
    });

    it('delegates with minimal required fields', async () => {
      service.upsertToken.mockResolvedValue(undefined);

      const payload = {
        userId: 'user-2',
        token: 'ios-token',
        platform: DevicePlatform.IOS,
      };

      await controller.upsert(payload);

      expect(service.upsertToken).toHaveBeenCalledWith(payload);
    });
  });

  // ---- deactive ----

  describe('deactive', () => {
    it('delegates to service.deactivateToken with the token', async () => {
      service.deactivateToken.mockResolvedValue(undefined);

      await controller.deactive({ token: 'bad-token' });

      expect(service.deactivateToken).toHaveBeenCalledWith('bad-token');
    });

    it('propagates service errors', async () => {
      service.deactivateToken.mockRejectedValue(new Error('deactivation failed'));

      await expect(controller.deactive({ token: 'tok' })).rejects.toThrow('deactivation failed');
    });
  });
});
