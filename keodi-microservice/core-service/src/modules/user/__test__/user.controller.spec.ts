import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';

const mockUserService = {
  create: jest.fn(),
  delete: jest.fn(),
  updatePicture: jest.fn(),
  getById: jest.fn(),
  getAll: jest.fn(),
  searchOthers: jest.fn(),
  updateProfile: jest.fn(),
  onBoarding: jest.fn(),
  getOtherProfile: jest.fn(),
  updateLocation: jest.fn(),
  syncUsername: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create – delegates to service.create', async () => {
    const dto = { userId: 'u1', username: 'john', firstName: 'John', lastName: 'Doe' } as any;
    mockUserService.create.mockResolvedValue(undefined);

    await controller.create(dto);

    expect(mockUserService.create).toHaveBeenCalledWith(dto);
  });

  it('delete – delegates to service.delete with userId', async () => {
    mockUserService.delete.mockResolvedValue(undefined);

    await controller.delete({ userId: 'u1' });

    expect(mockUserService.delete).toHaveBeenCalledWith('u1');
  });

  it('updatePicture – delegates to service.updatePicture', async () => {
    const data = { file: Buffer.from(''), userId: 'u1', type: 'image/jpeg' };
    mockUserService.updatePicture.mockResolvedValue({ message: 'ok' });

    await controller.updatePicture(data);

    expect(mockUserService.updatePicture).toHaveBeenCalledWith(data.file, 'u1', 'image/jpeg');
  });

  it('getById – delegates to service.getById', async () => {
    mockUserService.getById.mockResolvedValue({ id: 'u1' });

    const result = await controller.getById({ userId: 'u1' });

    expect(mockUserService.getById).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ id: 'u1' });
  });

  it('getAll – delegates to service.getAll', async () => {
    mockUserService.getAll.mockResolvedValue([]);

    await controller.getAll();

    expect(mockUserService.getAll).toHaveBeenCalled();
  });

  it('searchOthers – delegates to service.searchOthers', async () => {
    const dto = { userId: 'u1', keyword: 'john', page: 1, limit: 10 } as any;
    mockUserService.searchOthers.mockResolvedValue({ users: [] });

    await controller.searchOthers(dto);

    expect(mockUserService.searchOthers).toHaveBeenCalledWith(dto);
  });

  it('updateProfile – delegates to service.updateProfile', async () => {
    const data = { userId: 'u1', data: { firstName: 'Jane' } as any };
    mockUserService.updateProfile.mockResolvedValue({ message: 'ok' });

    await controller.updateProfile(data);

    expect(mockUserService.updateProfile).toHaveBeenCalledWith('u1', data.data);
  });

  it('onBoarding – delegates to service.onBoarding', async () => {
    mockUserService.onBoarding.mockResolvedValue({ message: 'ok' });

    await controller.onBoarding({ userId: 'u1', categoryIds: ['cat-1'] });

    expect(mockUserService.onBoarding).toHaveBeenCalledWith('u1', ['cat-1']);
  });

  it('getOtherProfile – delegates to service.getOtherProfile', async () => {
    mockUserService.getOtherProfile.mockResolvedValue({ id: 'u2' });

    await controller.getOtherProfile({ viewerId: 'u1', targetUserId: 'u2' });

    expect(mockUserService.getOtherProfile).toHaveBeenCalledWith('u1', 'u2');
  });

  it('updateLocation – delegates to service.updateLocation', async () => {
    mockUserService.updateLocation.mockResolvedValue(undefined);

    await controller.updateLocation({ userId: 'u1', latitude: 10.0, longitude: 106.0 });

    expect(mockUserService.updateLocation).toHaveBeenCalledWith('u1', 10.0, 106.0);
  });

  it('syncUsername – delegates to service.syncUsername', async () => {
    const dto = { userId: 'u1', username: 'newname' } as any;
    mockUserService.syncUsername.mockResolvedValue({ message: 'USERNAME_SYNCED' });

    await controller.syncUsername(dto);

    expect(mockUserService.syncUsername).toHaveBeenCalledWith(dto);
  });
});
