import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ImageService } from 'src/providers/image/image.service';
import { UserTopics } from 'src/shared/constants/topic.constant';

const mockKafkaClient = {
  emit: jest.fn(),
};

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: ImageService, useValue: { uploadAndGetKey: jest.fn().mockResolvedValue('user_images/uuid-1') } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);
  });

  describe('searchUsers', () => {
    it('should return empty result when keyword is blank', async () => {
      const result = await service.searchUsers('u1', '   ', 1, 10);

      expect(result).toEqual({ users: [], total: 0, page: 1, totalPages: 0, limit: 10 });
      expect(mockKafkaService.sendWithTimeout).not.toHaveBeenCalled();
    });

    it('should call UserTopics.SearchOthers with trimmed keyword', async () => {
      const expected = { users: [{ id: 'u2' }], total: 1, page: 1, totalPages: 1, limit: 10 };
      mockKafkaService.sendWithTimeout.mockResolvedValue(expected);

      const result = await service.searchUsers('u1', '  john  ', 1, 10);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.SearchOthers,
        { userId: 'u1', keyword: 'john', page: 1, limit: 10 },
      );
      expect(result).toEqual(expected);
    });

    it('should propagate kafka error from searchUsers', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('search error'));
      await expect(service.searchUsers('u1', 'john', 1, 10)).rejects.toThrow('search error');
    });
  });

  describe('unverifyUser', () => {
    it('should call UserTopics.Unverify with userId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'unverified' });

      await service.unverifyUser('u1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.Unverify,
        { userId: 'u1' },
      );
    });
  });

  describe('updateUsername', () => {
    it('should call UserTopics.UpdateUsername with userId, username and accessToken', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'updated' });

      await service.updateUsername('u1', 'johndoe', 'at-123');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.UpdateUsername,
        { userId: 'u1', username: 'johndoe', accessToken: 'at-123' },
      );
    });

    it('should propagate kafka error from updateUsername', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('username taken'));
      await expect(service.updateUsername('u1', 'taken', 'at')).rejects.toThrow('username taken');
    });
  });

  describe('updatePicture', () => {
    it('should upload image then call UserTopics.UpdatePicture with userId and key', async () => {
      const fileBuffer = Buffer.from('image data');
      mockKafkaService.sendWithTimeout.mockResolvedValue({ pictureUrl: 'http://img.url' });

      await service.updatePicture('u1', fileBuffer, 'image/png');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.UpdatePicture,
        { userId: 'u1', key: 'user_images/uuid-1' },
      );
    });
  });

  describe('updateProfile', () => {
    it('should call UserTopics.UpdateProfile with userId and data', async () => {
      const profileData = { bio: 'Hello world' } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'updated' });

      await service.updateProfile('u1', profileData);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.UpdateProfile,
        { userId: 'u1', data: profileData },
      );
    });
  });

  describe('getAll', () => {
    it('should call UserTopics.GetAll with empty payload', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }];
      mockKafkaService.sendWithTimeout.mockResolvedValue(users);

      const result = await service.getAll();

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(UserTopics.GetAll, {});
      expect(result).toEqual(users);
    });
  });

  describe('getOtherProfile', () => {
    it('should call UserTopics.GetOtherProfile with viewerId and targetUserId', async () => {
      const profile = { id: 'u2', username: 'jane' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(profile);

      const result = await service.getOtherProfile('viewer-1', 'target-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.GetOtherProfile,
        { viewerId: 'viewer-1', targetUserId: 'target-1' },
      );
      expect(result).toEqual(profile);
    });
  });

  describe('onBoarding', () => {
    it('should call UserTopics.Onboarding with userId and categoryIds', async () => {
      const categoryIds = ['cat-1', 'cat-2'];
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'ok' });

      await service.onBoarding('u1', categoryIds);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.Onboarding,
        { userId: 'u1', categoryIds },
      );
    });
  });

  describe('updateLocation', () => {
    it('should emit UserTopics.UpdateLocation with userId, latitude and longitude', () => {
      service.updateLocation('u1', 10.5, 106.7);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        UserTopics.UpdateLocation,
        { userId: 'u1', latitude: 10.5, longitude: 106.7 },
      );
    });

    it('should not throw and should call emit synchronously (fire-and-forget)', () => {
      expect(() => service.updateLocation('u1', 0, 0)).not.toThrow();
      expect(mockKafkaClient.emit).toHaveBeenCalledTimes(1);
    });
  });
});
