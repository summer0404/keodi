import { Test, TestingModule } from '@nestjs/testing';
import { SettingService } from '../setting.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { SettingTopics } from 'src/shared/constants/topic.constant';

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
};

describe('SettingService', () => {
  let service: SettingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingService,
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<SettingService>(SettingService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should call SettingTopics.Get with userId', async () => {
      const result = { notifications: true, theme: 'dark' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.get('user-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        SettingTopics.Get,
        { userId: 'user-1' },
      );
      expect(response).toEqual(result);
    });

    it('should propagate error from get', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('settings error'));
      await expect(service.get('user-1')).rejects.toThrow('settings error');
    });

    it('should pass the exact userId to kafka', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({});
      await service.get('specific-user-id');
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        SettingTopics.Get,
        { userId: 'specific-user-id' },
      );
    });
  });

  describe('update', () => {
    it('should call SettingTopics.Update with userId and updateDto', async () => {
      const dto = { notifications: false, language: 'en' } as any;
      const result = { message: 'settings updated' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.update('user-1', dto);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        SettingTopics.Update,
        { userId: 'user-1', updateUserSettingDto: dto },
      );
      expect(response).toEqual(result);
    });

    it('should propagate error from update', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('update error'));
      await expect(service.update('user-1', {} as any)).rejects.toThrow('update error');
    });

    it('should pass the full dto object to kafka', async () => {
      const dto = { theme: 'light', pushNotifications: true, emailNotifications: false } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({});

      await service.update('user-2', dto);

      const callArgs = mockKafkaService.sendWithTimeout.mock.calls[0];
      expect(callArgs[1].updateUserSettingDto).toEqual(dto);
    });

    it('should not use incorrect topic for update operation', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({});
      await service.update('user-1', {} as any);

      const topicUsed = mockKafkaService.sendWithTimeout.mock.calls[0][0];
      expect(topicUsed).toBe(SettingTopics.Update);
      expect(topicUsed).not.toBe(SettingTopics.Get);
    });
  });
});
