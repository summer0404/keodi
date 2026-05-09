import { Test, TestingModule } from '@nestjs/testing';
import { MemberController } from '../member.controller';
import { MemberService } from '../member.service';

const mockMemberService = {
  add: jest.fn(),
  leave: jest.fn(),
};

describe('MemberController', () => {
  let controller: MemberController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [{ provide: MemberService, useValue: mockMemberService }],
    }).compile();

    controller = module.get<MemberController>(MemberController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('add delegates to service', async () => {
    const payload = {
      conversationId: 'conv-1',
      requesterId: 'user-1',
      memberIds: ['user-2'],
    };
    await controller.add(payload);
    expect(mockMemberService.add).toHaveBeenCalledWith(payload);
  });

  it('leave delegates to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'user-1' };
    await controller.leave(payload);
    expect(mockMemberService.leave).toHaveBeenCalledWith(payload);
  });
});
