import { Test, TestingModule } from '@nestjs/testing';
import { SettingController } from '../setting.controller';
import { SettingService } from '../setting.service';

const mockSettingService = {
  get: jest.fn(),
  update: jest.fn(),
};

describe('SettingController', () => {
  let controller: SettingController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingController],
      providers: [{ provide: SettingService, useValue: mockSettingService }],
    }).compile();

    controller = module.get<SettingController>(SettingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('get', () => {
    it('delegates to service.get with userId', async () => {
      mockSettingService.get.mockResolvedValue({ theme: 'dark' });

      const result = await controller.get({ userId: 'u1' });

      expect(mockSettingService.get).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ theme: 'dark' });
    });
  });

  describe('update', () => {
    it('delegates to service.update with userId and DTO', async () => {
      const dto = { theme: 'light' } as any;
      mockSettingService.update.mockResolvedValue({ theme: 'light' });

      const result = await controller.update({ userId: 'u1', updateUserSettingDto: dto });

      expect(mockSettingService.update).toHaveBeenCalledWith('u1', dto);
      expect(result).toEqual({ theme: 'light' });
    });

    it('propagates errors from service.update', async () => {
      mockSettingService.update.mockRejectedValue(new Error('User not found'));

      await expect(controller.update({ userId: 'missing', updateUserSettingDto: {} as any })).rejects.toThrow('User not found');
    });
  });
});
