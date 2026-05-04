import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { OwnerApplicationController } from '../owner-application.controller';
import { OwnerApplicationService } from '../owner-application.service';

const mockOwnerApplicationService = {
  getAll: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  resubmit: jest.fn(),
  getMe: jest.fn(),
};

const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OwnerApplicationController>(
      OwnerApplicationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAll', () => {
    it('delegates to service.getAll with query', async () => {
      const query = { page: 1, limit: 10 } as any;
      const result = { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      mockOwnerApplicationService.getAll.mockResolvedValue(result);

      const response = await controller.getAll(query);

      expect(mockOwnerApplicationService.getAll).toHaveBeenCalledWith(query);
      expect(response).toEqual(result);
    });

    it('delegates with status filter', async () => {
      const query = { page: 1, limit: 10, status: 'PENDING' } as any;
      mockOwnerApplicationService.getAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.getAll(query);

      expect(mockOwnerApplicationService.getAll).toHaveBeenCalledWith(query);
    });

    it('propagates error from service.getAll', async () => {
      mockOwnerApplicationService.getAll.mockRejectedValue(
        new Error('kafka error'),
      );
      await expect(controller.getAll({} as any)).rejects.toThrow('kafka error');
    });
  });

  describe('approve', () => {
    it('delegates to service.approve with ownerApplicationId', async () => {
      const result = { message: 'Owner application approved successfully' };
      mockOwnerApplicationService.approve.mockResolvedValue(result);

      const response = await controller.approve('app-1');

      expect(mockOwnerApplicationService.approve).toHaveBeenCalledWith('app-1');
      expect(response).toEqual(result);
    });

    it('propagates error from service.approve', async () => {
      mockOwnerApplicationService.approve.mockRejectedValue(
        new Error('not found'),
      );
      await expect(controller.approve('app-1')).rejects.toThrow('not found');
    });
  });

  describe('reject', () => {
    it('delegates to service.reject with ownerApplicationId and dto', async () => {
      const dto = { reason: 'Incomplete documents' } as any;
      const result = { message: 'Owner application rejected successfully' };
      mockOwnerApplicationService.reject.mockResolvedValue(result);

      const response = await controller.reject('app-1', dto);

      expect(mockOwnerApplicationService.reject).toHaveBeenCalledWith(
        'app-1',
        dto,
      );
      expect(response).toEqual(result);
    });

    it('propagates error from service.reject', async () => {
      mockOwnerApplicationService.reject.mockRejectedValue(
        new Error('conflict'),
      );
      await expect(controller.reject('app-1', {} as any)).rejects.toThrow(
        'conflict',
      );
    });
  });

  describe('resubmit', () => {
    it('delegates to service.resubmit with user.id and dto', async () => {
      const user = { id: 'user-1' } as any;
      const dto = {
        businessName: 'New Corp',
        businessPhone: '0123456789',
      } as any;
      const result = { message: 'Owner application resubmitted successfully' };
      mockOwnerApplicationService.resubmit.mockResolvedValue(result);

      const response = await controller.resubmit(user, dto);

      expect(mockOwnerApplicationService.resubmit).toHaveBeenCalledWith(
        'user-1',
        dto,
      );
      expect(response).toEqual(result);
    });

    it('propagates error from service.resubmit', async () => {
      mockOwnerApplicationService.resubmit.mockRejectedValue(
        new Error('not rejected'),
      );
      await expect(
        controller.resubmit({ id: 'user-1' } as any, {} as any),
      ).rejects.toThrow('not rejected');
    });
  });

  describe('getMe', () => {
    it('delegates to service.getMe with user.id', async () => {
      const user = { id: 'user-1' } as any;
      const result = { id: 'app-1', status: 'PENDING' };
      mockOwnerApplicationService.getMe.mockResolvedValue(result);

      const response = await controller.getMe(user);

      expect(mockOwnerApplicationService.getMe).toHaveBeenCalledWith('user-1');
      expect(response).toEqual(result);
    });

    it('returns null when no application exists', async () => {
      mockOwnerApplicationService.getMe.mockResolvedValue(null);

      const response = await controller.getMe({ id: 'user-1' } as any);

      expect(response).toBeNull();
    });

    it('propagates error from service.getMe', async () => {
      mockOwnerApplicationService.getMe.mockRejectedValue(
        new Error('kafka error'),
      );
      await expect(controller.getMe({ id: 'user-1' } as any)).rejects.toThrow(
        'kafka error',
      );
    });
  });
});
