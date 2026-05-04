import { Test, TestingModule } from '@nestjs/testing';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnerApplicationTopics } from 'src/shared/constants/topic.constant';
import { OwnerApplicationService } from '../owner-application.service';

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
};

describe('OwnerApplicationService (api-gateway)', () => {
  let service: OwnerApplicationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerApplicationService,
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<OwnerApplicationService>(OwnerApplicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('sends to OwnerApplicationTopics.GetAll with query', async () => {
      const query = { page: 1, limit: 10 } as any;
      const result = { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getAll(query);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        OwnerApplicationTopics.GetAll,
        query,
      );
      expect(response).toEqual(result);
    });

    it('propagates kafka error from getAll', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('kafka error'),
      );
      await expect(service.getAll({} as any)).rejects.toThrow('kafka error');
    });
  });

  describe('resubmit', () => {
    it('sends to OwnerApplicationTopics.Resubmit with userId spread with dto', async () => {
      const userId = 'user-1';
      const dto = {
        businessName: 'New Corp',
        businessPhone: '0123456789',
        businessAddress: '123 Main St',
        taxId: 'TAX-001',
        proofDocumentUrls: ['https://example.com/doc.pdf'],
      } as any;
      const result = { message: 'Owner application resubmitted successfully' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.resubmit(userId, dto);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        OwnerApplicationTopics.Resubmit,
        { userId, ...dto },
      );
      expect(response).toEqual(result);
    });

    it('propagates kafka error from resubmit', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('conflict'));
      await expect(service.resubmit('user-1', {} as any)).rejects.toThrow(
        'conflict',
      );
    });
  });

  describe('getMe', () => {
    it('sends to OwnerApplicationTopics.GetMe with userId', async () => {
      const userId = 'user-1';
      const result = { id: 'app-1', status: 'PENDING' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.getMe(userId);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        OwnerApplicationTopics.GetMe,
        { userId },
      );
      expect(response).toEqual(result);
    });

    it('returns null when no application found', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue(null);

      const response = await service.getMe('user-1');

      expect(response).toBeNull();
    });

    it('propagates kafka error from getMe', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('kafka error'),
      );
      await expect(service.getMe('user-1')).rejects.toThrow('kafka error');
    });
  });
});
