import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UserService } from '../user.service';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { UserTopics } from 'src/shared/constants/topic.constant';

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 'user-id',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed-pass',
  isVerified: true,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UserService', () => {
  let service: UserService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let kafkaService: jest.Mocked<KafkaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
          },
        },
        {
          provide: KafkaService,
          useValue: {
            sendWithTimeout: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    kafkaService = module.get(KafkaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // unverifyUser
  // ---------------------------------------------------------------------------
  describe('unverifyUser', () => {
    it('sets isVerified to false for a verified user and returns success message', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isVerified: true }));
      (prismaService.user.update as jest.Mock).mockResolvedValue(makeUser({ isVerified: false }));

      const result = await service.unverifyUser('user-id');

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isVerified: false } }),
      );
      expect(result).toEqual({ message: 'User unverified successfully' });
    });

    it('does not call update when user is already unverified', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isVerified: false }));

      const result = await service.unverifyUser('user-id');

      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'User unverified successfully' });
    });

    it('throws BAD_REQUEST when user is not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.unverifyUser('ghost-id');
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.BAD_REQUEST);
        expect(payload.message).toBe('User not found');
      }
    });

    it('propagates unexpected DB errors via handleServiceErrorCatching', async () => {
      (prismaService.user.findUnique as jest.Mock).mockRejectedValue(new Error('db failure'));

      await expect(service.unverifyUser('uid')).rejects.toThrow(RpcException);
    });
  });

  // ---------------------------------------------------------------------------
  // updateUsername
  // ---------------------------------------------------------------------------
  describe('updateUsername', () => {
    it('updates username, syncs via Kafka, blacklists access token and returns success', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // username not in use
        .mockResolvedValueOnce(makeUser()); // user exists
      (prismaService.user.update as jest.Mock).mockResolvedValue(makeUser({ username: 'newuser' }));
      (kafkaService.sendWithTimeout as jest.Mock).mockResolvedValue({ ok: true });
      redisService.set.mockResolvedValue(undefined as any);

      const result = await service.updateUsername('user-id', 'newuser', 'access-token');

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { username: 'newuser' } }),
      );
      expect(kafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.UsernameSynced,
        expect.objectContaining({ userId: 'user-id', username: 'newuser' }),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        'blacklist_token:access-token',
        'true',
        3600,
      );
      expect(result).toEqual({ message: 'Username updated successfully' });
    });

    it('throws BAD_REQUEST when the new username is already taken', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(makeUser());

      try {
        await service.updateUsername('user-id', 'taken', 'at');
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.BAD_REQUEST);
        expect(payload.message).toBe('Username already used');
      }
    });

    it('throws BAD_REQUEST when user with the given id does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // username not taken
        .mockResolvedValueOnce(null); // user not found

      try {
        await service.updateUsername('ghost-id', 'newuser', 'at');
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.BAD_REQUEST);
        expect(payload.message).toBe('User not found');
      }
    });

    it('rolls back username and throws INTERNAL_SERVER_ERROR when Kafka sync fails', async () => {
      const user = makeUser();
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(user);
      (prismaService.user.update as jest.Mock)
        .mockResolvedValueOnce(makeUser({ username: 'newuser' })) // first update
        .mockResolvedValueOnce(user); // rollback update
      (kafkaService.sendWithTimeout as jest.Mock).mockRejectedValue(new Error('kafka down'));

      try {
        await service.updateUsername('user-id', 'newuser', 'at');
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(payload.message).toContain('rolled back');
        // rollback update was called
        expect(prismaService.user.update).toHaveBeenCalledTimes(2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // createUserInfomation
  // ---------------------------------------------------------------------------
  describe('createUserInfomation', () => {
    it('sends user creation Kafka message with correct payload', async () => {
      const user = makeUser();
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (kafkaService.sendWithTimeout as jest.Mock).mockResolvedValue({ ok: true });

      await service.createUserInfomation('user-id', 'testuser', 'First', 'Last', 'pic.png');

      expect(kafkaService.sendWithTimeout).toHaveBeenCalledWith(
        UserTopics.Create,
        expect.objectContaining({
          userId: 'user-id',
          username: 'testuser',
          firstName: 'First',
          lastName: 'Last',
          picture: 'pic.png',
        }),
      );
    });

    it('throws BAD_REQUEST when user is not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.createUserInfomation('ghost-id');
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.BAD_REQUEST);
        expect(payload.message).toBe('User not found');
      }
    });

    it('sends Kafka message without optional fields when called with only userId', async () => {
      const user = makeUser();
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (kafkaService.sendWithTimeout as jest.Mock).mockResolvedValue({ ok: true });

      await service.createUserInfomation('user-id');

      const [, payload] = (kafkaService.sendWithTimeout as jest.Mock).mock.calls[0];
      expect(payload.userId).toBe('user-id');
      expect(payload.firstName).toBeUndefined();
    });

    it('propagates unexpected errors via handleServiceErrorCatching', async () => {
      (prismaService.user.findUnique as jest.Mock).mockRejectedValue(new Error('db crash'));

      await expect(service.createUserInfomation('uid')).rejects.toThrow(RpcException);
    });
  });
});
