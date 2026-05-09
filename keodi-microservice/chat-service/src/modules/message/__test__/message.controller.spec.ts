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

  it('send delegates to service', async () => {
    const payload = { conversationId: 'conv-1', senderId: 'u1', content: 'hi' };
    await controller.send(payload);
    expect(mockMessageService.send).toHaveBeenCalledWith(payload);
  });

  it('list delegates to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1' };
    await controller.list(payload);
    expect(mockMessageService.list).toHaveBeenCalledWith(payload);
  });

  it('delete delegates to service', async () => {
    const payload = { messageId: 'msg-1', userId: 'u1' };
    await controller.delete(payload);
    expect(mockMessageService.delete).toHaveBeenCalledWith(payload);
  });

  it('markRead delegates to service', async () => {
    const payload = { conversationId: 'conv-1', userId: 'u1' };
    await controller.markRead(payload);
    expect(mockMessageService.markRead).toHaveBeenCalledWith(payload);
  });
});
