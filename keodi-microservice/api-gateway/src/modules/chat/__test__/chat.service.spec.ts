import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ImageService } from 'src/providers/image/image.service';
import { ApiErrorMessages } from 'src/shared/constants/error.constant';
import { ImageFolders } from 'src/shared/constants/image.constant';
import { MessageTopics } from 'src/shared/constants/topic.constant';
import { MessageType } from 'src/shared/enums/chat.enum';
import { ChatService } from '../chat.service';

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
};

const mockImageService = {
  uploadAndGetKey: jest.fn(),
};

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'photo.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: Buffer.from('fake-image'),
  size: 10,
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
  ...overrides,
});

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: ImageService, useValue: mockImageService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('sends text message with content directly', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ id: 'msg-1' });

      await service.sendMessage('user-1', 'conv-1', { content: 'Hello' });

      expect(mockImageService.uploadAndGetKey).not.toHaveBeenCalled();
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        MessageTopics.Send,
        expect.objectContaining({ content: 'Hello', senderId: 'user-1', conversationId: 'conv-1' }),
      );
    });

    it('uploads file and sends S3 key as content for IMAGE type', async () => {
      const file = makeFile();
      mockImageService.uploadAndGetKey.mockResolvedValue('chat_images/1234567890');
      mockKafkaService.sendWithTimeout.mockResolvedValue({ id: 'msg-2' });

      await service.sendMessage('user-1', 'conv-1', { type: MessageType.IMAGE }, file);

      expect(mockImageService.uploadAndGetKey).toHaveBeenCalledWith(
        ImageFolders.CHAT,
        file.buffer,
        file.mimetype,
      );
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        MessageTopics.Send,
        expect.objectContaining({ content: 'chat_images/1234567890', type: MessageType.IMAGE }),
      );
    });

    it('throws BadRequestException with IMAGE_FILE_REQUIRED when type is IMAGE but no file is provided', async () => {
      await expect(
        service.sendMessage('user-1', 'conv-1', { type: MessageType.IMAGE }),
      ).rejects.toThrow(new BadRequestException(ApiErrorMessages.IMAGE_FILE_REQUIRED));

      expect(mockImageService.uploadAndGetKey).not.toHaveBeenCalled();
      expect(mockKafkaService.sendWithTimeout).not.toHaveBeenCalled();
    });
  });
});
