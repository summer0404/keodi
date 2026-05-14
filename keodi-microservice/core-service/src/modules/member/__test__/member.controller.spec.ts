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

  it('delegates add to service', async () => {
    const payload = {
      conversationId: 'conv-1',
      requesterId: 'u1',
      memberIds: ['u2'],
    };
    mockMemberService.add.mockResolvedValue({ success: true });

    const result = await controller.add(payload);

    expect(mockMemberService.add).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });

  it('delegates leave to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1' };
    mockMemberService.leave.mockResolvedValue({ success: true });

    const result = await controller.leave(payload);

    expect(mockMemberService.leave).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });
});
