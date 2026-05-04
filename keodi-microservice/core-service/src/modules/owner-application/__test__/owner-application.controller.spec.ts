import { Test, TestingModule } from '@nestjs/testing';
import { OwnerApplicationController } from '../owner-application.controller';
import { OwnerApplicationService } from '../owner-application.service';

const mockOwnerApplicationService = {
  create: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  getAll: jest.fn(),
  resubmit: jest.fn(),
  getStatusByUserId: jest.fn(),
};

describe('OwnerApplicationController', () => {
  let controller: OwnerApplicationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnerApplicationController],
      providers: [
        {
          provide: OwnerApplicationService,
          useValue: mockOwnerApplicationService,
        },
      ],
    }).compile();

    controller = module.get<OwnerApplicationController>(
      OwnerApplicationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to service.create with DTO', async () => {
      const dto = { userId: 'u1', businessName: 'My Cafe' } as any;
      mockOwnerApplicationService.create.mockResolvedValue({
        message: 'created',
        ownerApplicationId: 'app-1',
      });

      const result = await controller.create(dto);

      expect(mockOwnerApplicationService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        message: 'created',
        ownerApplicationId: 'app-1',
      });
    });
  });

  describe('approve', () => {
    it('delegates to service.approve with applicationId', async () => {
      mockOwnerApplicationService.approve.mockResolvedValue({
        message: 'approved',
      });

      const result = await controller.approve({ applicationId: 'app-1' });

      expect(mockOwnerApplicationService.approve).toHaveBeenCalledWith('app-1');
      expect(result).toEqual({ message: 'approved' });
    });
  });

  describe('reject', () => {
    it('delegates to service.reject with applicationId and data', async () => {
      const rejectDto = { reason: 'Incomplete docs' } as any;
      mockOwnerApplicationService.reject.mockResolvedValue({
        message: 'rejected',
      });

      const result = await controller.reject({
        applicationId: 'app-1',
        data: rejectDto,
      });

      expect(mockOwnerApplicationService.reject).toHaveBeenCalledWith(
        'app-1',
        rejectDto,
      );
      expect(result).toEqual({ message: 'rejected' });
    });
  });

  describe('getAll', () => {
    it('delegates to service.getAll with data', async () => {
      const data = { page: 1, limit: 10 } as any;
      const result = { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      mockOwnerApplicationService.getAll.mockResolvedValue(result);

      const response = await controller.getAll(data);

      expect(mockOwnerApplicationService.getAll).toHaveBeenCalledWith(data);
      expect(response).toEqual(result);
    });

    it('delegates with status filter', async () => {
      const data = { page: 1, limit: 10, status: 'PENDING' } as any;
      mockOwnerApplicationService.getAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.getAll(data);

      expect(mockOwnerApplicationService.getAll).toHaveBeenCalledWith(data);
    });

    it('propagates error from service.getAll', async () => {
      mockOwnerApplicationService.getAll.mockRejectedValue(
        new Error('db error'),
      );
      await expect(controller.getAll({} as any)).rejects.toThrow('db error');
    });
  });

  describe('resubmit', () => {
    it('delegates to service.resubmit with data', async () => {
      const data = {
        userId: 'user-1',
        businessName: 'Corp',
        businessPhone: '0123456789',
      } as any;
      const result = { message: 'Owner application resubmitted successfully' };
      mockOwnerApplicationService.resubmit.mockResolvedValue(result);

      const response = await controller.resubmit(data);

      expect(mockOwnerApplicationService.resubmit).toHaveBeenCalledWith(data);
      expect(response).toEqual(result);
    });

    it('propagates error from service.resubmit', async () => {
      mockOwnerApplicationService.resubmit.mockRejectedValue(
        new Error('conflict'),
      );
      await expect(controller.resubmit({} as any)).rejects.toThrow('conflict');
    });
  });

  describe('getMe', () => {
    it('delegates to service.getStatusByUserId with userId', async () => {
      const data = { userId: 'user-1' };
      const result = { id: 'app-1', status: 'PENDING', userId: 'user-1' };
      mockOwnerApplicationService.getStatusByUserId.mockResolvedValue(result);

      const response = await controller.getMe(data);

      expect(
        mockOwnerApplicationService.getStatusByUserId,
      ).toHaveBeenCalledWith('user-1');
      expect(response).toEqual(result);
    });

    it('returns null when no application exists', async () => {
      mockOwnerApplicationService.getStatusByUserId.mockResolvedValue(null);

      const response = await controller.getMe({ userId: 'user-1' });

      expect(response).toBeNull();
    });

    it('propagates error from service.getStatusByUserId', async () => {
      mockOwnerApplicationService.getStatusByUserId.mockRejectedValue(
        new Error('db error'),
      );
      await expect(controller.getMe({ userId: 'user-1' })).rejects.toThrow(
        'db error',
      );
    });
  });
});
