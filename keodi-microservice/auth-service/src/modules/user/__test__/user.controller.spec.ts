import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            unverifyUser: jest.fn(),
            updateUsername: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('unverifyUser', () => {
    it('delegates to userService.unverifyUser with the userId from payload', async () => {
      userService.unverifyUser.mockResolvedValue({ message: 'User unverified successfully' });

      const result = await controller.unverifyUser({ userId: 'user-id' });

      expect(userService.unverifyUser).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({ message: 'User unverified successfully' });
    });

    it('propagates the error thrown by userService.unverifyUser', async () => {
      const rpcErr = new Error('rpc error');
      userService.unverifyUser.mockRejectedValue(rpcErr);

      await expect(controller.unverifyUser({ userId: 'bad-id' })).rejects.toThrow('rpc error');
    });
  });

  describe('updateUsername', () => {
    it('delegates to userService.updateUsername with all three fields', async () => {
      userService.updateUsername.mockResolvedValue({ message: 'Username updated successfully' });

      const payload = { userId: 'user-id', username: 'newname', accessToken: 'at' };
      const result = await controller.updateUsername(payload);

      expect(userService.updateUsername).toHaveBeenCalledWith('user-id', 'newname', 'at');
      expect(result).toEqual({ message: 'Username updated successfully' });
    });

    it('returns the value from userService.updateUsername unchanged', async () => {
      const serviceResponse = { message: 'Username updated successfully' };
      userService.updateUsername.mockResolvedValue(serviceResponse);

      const result = await controller.updateUsername({
        userId: 'uid',
        username: 'u',
        accessToken: 'tok',
      });

      expect(result).toBe(serviceResponse);
    });

    it('propagates service errors to the caller', async () => {
      userService.updateUsername.mockRejectedValue(new Error('conflict'));

      await expect(
        controller.updateUsername({ userId: 'uid', username: 'taken', accessToken: 'at' }),
      ).rejects.toThrow('conflict');
    });

    it('passes accessToken exactly as received to the service', async () => {
      userService.updateUsername.mockResolvedValue({ message: 'ok' });

      await controller.updateUsername({
        userId: 'uid',
        username: 'u',
        accessToken: 'Bearer eyJhbGci',
      });

      expect(userService.updateUsername).toHaveBeenCalledWith(
        'uid',
        'u',
        'Bearer eyJhbGci',
      );
    });

    it('handles the case where the service returns undefined gracefully', async () => {
      userService.updateUsername.mockResolvedValue(undefined);

      const result = await controller.updateUsername({ userId: 'uid', username: 'u', accessToken: 'at' });

      expect(result).toBeUndefined();
    });
  });
});
