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

  it('create delegates to service', async () => {
    const payload = { createdById: 'u1', memberIds: ['u2'], type: 'DIRECT' } as any;
    await controller.create(payload);
    expect(mockConversationService.create).toHaveBeenCalledWith(payload);
  });

  it('getById delegates to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1' };
    await controller.getById(payload);
    expect(mockConversationService.getById).toHaveBeenCalledWith(payload);
  });

  it('list delegates to service', async () => {
    const payload = { userId: 'u1', limit: 20 };
    await controller.list(payload);
    expect(mockConversationService.list).toHaveBeenCalledWith(payload);
  });

  it('update delegates to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1', name: 'name' };
    await controller.update(payload);
    expect(mockConversationService.update).toHaveBeenCalledWith(payload);
  });
});
