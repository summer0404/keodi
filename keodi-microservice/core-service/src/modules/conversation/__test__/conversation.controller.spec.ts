import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from '../conversation.controller';
import { ConversationService } from '../conversation.service';

const mockConversationService = {
  create: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
};

describe('ConversationController', () => {
  let controller: ConversationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        { provide: ConversationService, useValue: mockConversationService },
      ],
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates create to service', async () => {
    const payload = { createdById: 'u1', type: 'DIRECT', memberIds: ['u2'] } as any;
    mockConversationService.create.mockResolvedValue({ id: 'conv-1' });

    const result = await controller.create(payload);

    expect(mockConversationService.create).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: 'conv-1' });
  });

  it('delegates getById to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1' };
    mockConversationService.getById.mockResolvedValue({ id: 'conv-1' });

    const result = await controller.getById(payload);

    expect(mockConversationService.getById).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: 'conv-1' });
  });

  it('delegates list to service', async () => {
    const payload = { userId: 'u1', limit: 20 };
    mockConversationService.list.mockResolvedValue({ items: [] });

    const result = await controller.list(payload);

    expect(mockConversationService.list).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ items: [] });
  });

  it('delegates update to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1', name: 'New name' };
    mockConversationService.update.mockResolvedValue({ id: 'conv-1' });

    const result = await controller.update(payload);

    expect(mockConversationService.update).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: 'conv-1' });
  });
});
