import { Test, TestingModule } from '@nestjs/testing';
import { MessageController } from '../message.controller';
import { MessageService } from '../message.service';

const mockMessageService = {
  send: jest.fn(),
  list: jest.fn(),
  delete: jest.fn(),
  markRead: jest.fn(),
};

describe('MessageController', () => {
  let controller: MessageController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [{ provide: MessageService, useValue: mockMessageService }],
    }).compile();

    controller = module.get<MessageController>(MessageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates send to service', async () => {
    const payload = { conversationId: 'conv-1', senderId: 'u1', content: 'Hi' };
    mockMessageService.send.mockResolvedValue({ id: 'msg-1' });

    const result = await controller.send(payload);

    expect(mockMessageService.send).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: 'msg-1' });
  });

  it('delegates list to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1' };
    mockMessageService.list.mockResolvedValue({ items: [] });

    const result = await controller.list(payload);

    expect(mockMessageService.list).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ items: [] });
  });

  it('delegates delete to service', async () => {
    const payload = { messageId: 'msg-1', userId: 'u1' };
    mockMessageService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(payload);

    expect(mockMessageService.delete).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });

  it('delegates markRead to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1' };
    mockMessageService.markRead.mockResolvedValue({ success: true });

    const result = await controller.markRead(payload);

    expect(mockMessageService.markRead).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });
});
