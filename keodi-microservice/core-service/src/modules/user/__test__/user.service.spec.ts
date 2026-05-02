import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UserService } from '../user.service';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from 'src/modules/image/image.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { FriendRequestStatus, ProfileVisibility } from '@prisma/client';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  userImage: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  userCategory: {
    createMany: jest.fn(),
  },
  userSetting: {
    upsert: jest.fn(),
  },
  friendship: {
    findUnique: jest.fn(),
  },
  friendRequest: {
    findFirst: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockImageService = {
  getImageViewUrl: jest.fn().mockResolvedValue('https://cdn.example.com/img.jpg'),
  uploadImage: jest.fn(),
};

const mockRedisService = {
  hSet: jest.fn(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ImageService, useValue: mockImageService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    it('calls prisma.user.create with correct data', async () => {
      mockPrismaService.user.create.mockResolvedValue({});

      await service.create({ userId: 'u1', username: 'john', firstName: 'John', lastName: 'Doe', picture: null });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id: 'u1', username: 'john' }) }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // delete
  // ──────────────────────────────────────────────
  describe('delete', () => {
    it('calls prisma.user.delete with correct id', async () => {
      mockPrismaService.user.delete.mockResolvedValue({});

      await service.delete('u1');

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });
  });

  // ──────────────────────────────────────────────
  // getById
  // ──────────────────────────────────────────────
  describe('getById', () => {
    it('throws RpcException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toThrow(RpcException);
    });

    it('returns user with resolved pictureUrl', async () => {
      const user = { id: 'u1', username: 'john', pictureUrl: 's3://pic.jpg' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.getById('u1') as any;

      expect(mockImageService.getImageViewUrl).toHaveBeenCalledWith('s3://pic.jpg');
      expect(result.pictureUrl).toBe('https://cdn.example.com/img.jpg');
    });

    it('returns user with null pictureUrl when no picture stored', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1', pictureUrl: null });

      const result = await service.getById('u1') as any;

      expect(mockImageService.getImageViewUrl).not.toHaveBeenCalled();
      expect(result.pictureUrl).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // updateProfile
  // ──────────────────────────────────────────────
  describe('updateProfile', () => {
    it('throws RpcException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile('missing', {} as any)).rejects.toThrow(RpcException);
    });

    it('throws RpcException when phone number is already in use by another user', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'u1' })
        .mockResolvedValueOnce({ id: 'u2' }); // different user has that phone

      await expect(service.updateProfile('u1', { phoneNumber: '0900000000' } as any)).rejects.toThrow(RpcException);
    });

    it('updates profile and returns success message', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'u1' }) // existing user
        .mockResolvedValueOnce(null);        // no collision
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updateProfile('u1', { phoneNumber: '0900000000' } as any) as any;

      expect(result.message).toBe('Profile updated successfully');
    });
  });

  // ──────────────────────────────────────────────
  // onBoarding
  // ──────────────────────────────────────────────
  describe('onBoarding', () => {
    it('throws RpcException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.onBoarding('missing', ['cat-1'])).rejects.toThrow(RpcException);
    });

    it('creates user categories and returns success message', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.userCategory.createMany.mockResolvedValue({ count: 1 });

      const result = await service.onBoarding('u1', ['cat-1']) as any;

      expect(mockPrismaService.userCategory.createMany).toHaveBeenCalled();
      expect(result.message).toBe('Onboarding completed successfully');
    });
  });

  // ──────────────────────────────────────────────
  // updateLocation
  // ──────────────────────────────────────────────
  describe('updateLocation', () => {
    it('stores location in redis', async () => {
      await service.updateLocation('u1', 10.0, 106.0);

      expect(mockRedisService.hSet).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // syncUsername
  // ──────────────────────────────────────────────
  describe('syncUsername', () => {
    it('upserts user and returns USERNAME_SYNCED', async () => {
      mockPrismaService.user.upsert.mockResolvedValue({});

      const result = await service.syncUsername({ userId: 'u1', username: 'newname' }) as any;

      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
      expect(result.message).toBe('USERNAME_SYNCED');
    });
  });

  // ──────────────────────────────────────────────
  // getOtherProfile
  // ──────────────────────────────────────────────
  describe('getOtherProfile', () => {
    it('throws NOT_FOUND when target user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getOtherProfile('viewer', 'missing')).rejects.toThrow(RpcException);
    });

    it('returns full profile when visibility is PUBLIC', async () => {
      const target = { id: 'u2', username: 'jane', firstName: 'Jane', lastName: 'Doe', phoneNumber: '123', dateOfBirth: null, pictureUrl: null };
      mockPrismaService.user.findUnique.mockResolvedValue(target);
      mockPrismaService.userSetting.upsert.mockResolvedValue({ profileVisibility: ProfileVisibility.PUBLIC });
      mockPrismaService.friendship.findUnique.mockResolvedValue(null);
      mockPrismaService.friendRequest.findFirst.mockResolvedValue(null);

      const result = await service.getOtherProfile('u1', 'u2') as any;

      expect(result.isProfileVisible).toBe(true);
    });

    it('hides phone/dob when profile is PRIVATE and viewer is not a friend', async () => {
      const target = { id: 'u2', username: 'jane', firstName: 'Jane', lastName: 'Doe', phoneNumber: '123', dateOfBirth: null, pictureUrl: null };
      mockPrismaService.user.findUnique.mockResolvedValue(target);
      mockPrismaService.userSetting.upsert.mockResolvedValue({ profileVisibility: ProfileVisibility.PRIVATE });
      mockPrismaService.friendship.findUnique.mockResolvedValue(null);
      mockPrismaService.friendRequest.findFirst.mockResolvedValue(null);

      const result = await service.getOtherProfile('u1', 'u2') as any;

      expect(result.isProfileVisible).toBe(false);
      expect(result.phoneNumber).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // searchOthers
  // ──────────────────────────────────────────────
  describe('searchOthers', () => {
    it('returns empty result when keyword is blank', async () => {
      const result = await service.searchOthers({ userId: 'u1', keyword: '  ', page: 1, limit: 10 }) as any;

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('calls $queryRaw for non-empty keyword', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.searchOthers({ userId: 'u1', keyword: 'john', page: 1, limit: 10 });

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });
});
