import { Test, TestingModule } from '@nestjs/testing';
import { FriendController } from '../friend.controller';
import { FriendService } from '../friend.service';

const mockFriendService = {
  sendRequest: jest.fn(),
  acceptRequest: jest.fn(),
  rejectRequest: jest.fn(),
  getFriends: jest.fn(),
  getPendingRequests: jest.fn(),
  removeFriend: jest.fn(),
  cancelRequest: jest.fn(),
};

describe('FriendController', () => {
  let controller: FriendController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendController],
      providers: [{ provide: FriendService, useValue: mockFriendService }],
    }).compile();

    controller = module.get<FriendController>(FriendController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sendRequest – delegates to service.sendRequest', async () => {
    mockFriendService.sendRequest.mockResolvedValue({ id: 'req-1' });

    const result = await controller.sendRequest({
      userId: 'u1',
      receiverId: 'u2',
    });

    expect(mockFriendService.sendRequest).toHaveBeenCalledWith('u1', 'u2');
    expect(result).toBeDefined();
  });

  it('acceptRequest – delegates to service.acceptRequest', async () => {
    mockFriendService.acceptRequest.mockResolvedValue({ success: true });

    await controller.acceptRequest({ userId: 'u1', requestId: 'req-1' });

    expect(mockFriendService.acceptRequest).toHaveBeenCalledWith('u1', 'req-1');
  });

  it('rejectRequest – delegates to service.rejectRequest', async () => {
    mockFriendService.rejectRequest.mockResolvedValue({ success: true });

    await controller.rejectRequest({ userId: 'u1', requestId: 'req-1' });

    expect(mockFriendService.rejectRequest).toHaveBeenCalledWith('u1', 'req-1');
  });

  it('getFriends – delegates to service.getFriends with DTO', async () => {
    const dto = {
      userId: 'u1',
      page: 1,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    } as any;
    mockFriendService.getFriends.mockResolvedValue({ friends: [] });

    await controller.getFriends(dto);

    expect(mockFriendService.getFriends).toHaveBeenCalledWith(dto);
  });

  it('getPendingRequests – delegates to service.getPendingRequests', async () => {
    const dto = {
      userId: 'u1',
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as any;
    mockFriendService.getPendingRequests.mockResolvedValue({ requests: [] });

    await controller.getPendingRequests(dto);

    expect(mockFriendService.getPendingRequests).toHaveBeenCalledWith(dto);
  });

  it('removeFriend – delegates to service.removeFriend', async () => {
    mockFriendService.removeFriend.mockResolvedValue({ success: true });

    await controller.removeFriend({ userId: 'u1', friendId: 'u2' });

    expect(mockFriendService.removeFriend).toHaveBeenCalledWith('u1', 'u2');
  });

  it('cancelRequest – delegates to service.cancelRequest', async () => {
    mockFriendService.cancelRequest.mockResolvedValue({ success: true });

    await controller.cancelRequest({ userId: 'u1', requestId: 'req-1' });

    expect(mockFriendService.cancelRequest).toHaveBeenCalledWith('u1', 'req-1');
  });
});
