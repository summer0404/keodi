import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { SettingService } from '../setting.service';
import { PrismaService } from 'src/database/prisma.service';

const mockPrismaService = {
  user: { findUnique: jest.fn() },
  userSetting: { upsert: jest.fn() },
};

describe('SettingService', () => {
  let service: SettingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SettingService>(SettingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // get
  // ──────────────────────────────────────────────
  describe('get', () => {
    it('upserts user settings and strips userId from response', async () => {
      mockPrismaService.userSetting.upsert.mockResolvedValue({ userId: 'u1', theme: 'dark', language: 'en' });

      const result = await service.get('u1') as any;

      expect(mockPrismaService.userSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
      expect(result.userId).toBeUndefined();
      expect(result.theme).toBe('dark');
    });

    it('handles prisma errors via handleServiceErrorCatching', async () => {
      mockPrismaService.userSetting.upsert.mockRejectedValue(new Error('DB error'));

      await expect(service.get('u1')).rejects.toThrow(RpcException);
    });
  });

  // ──────────────────────────────────────────────
  // update
  // ──────────────────────────────────────────────
  describe('update', () => {
    it('throws BAD_REQUEST when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { theme: 'dark' } as any)).rejects.toThrow(RpcException);
    });

    it('upserts settings and strips userId from response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.userSetting.upsert.mockResolvedValue({ userId: 'u1', theme: 'light', language: 'en' });

      const result = await service.update('u1', { theme: 'light' } as any) as any;

      expect(mockPrismaService.userSetting.upsert).toHaveBeenCalled();
      expect(result.userId).toBeUndefined();
      expect(result.theme).toBe('light');
    });

    it('upserts settings with spread data payload', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.userSetting.upsert.mockResolvedValue({ userId: 'u1', notificationsEnabled: false });

      await service.update('u1', { notificationsEnabled: false } as any);

      const call = mockPrismaService.userSetting.upsert.mock.calls[0][0];
      expect(call.update).toMatchObject({ notificationsEnabled: false });
    });
  });
});
