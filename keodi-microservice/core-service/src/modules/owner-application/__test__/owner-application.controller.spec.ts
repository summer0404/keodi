import { Test, TestingModule } from '@nestjs/testing';
import { OwnerApplicationController } from '../owner-application.controller';
import { OwnerApplicationService } from '../owner-application.service';

const mockOwnerApplicationService = {
  create: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
};

describe('OwnerApplicationController', () => {
  let controller: OwnerApplicationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnerApplicationController],
      providers: [{ provide: OwnerApplicationService, useValue: mockOwnerApplicationService }],
    }).compile();

    controller = module.get<OwnerApplicationController>(OwnerApplicationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to service.create with DTO', async () => {
      const dto = { userId: 'u1', businessName: 'My Cafe' } as any;
      mockOwnerApplicationService.create.mockResolvedValue({ message: 'created', ownerApplicationId: 'app-1' });

      const result = await controller.create(dto);

      expect(mockOwnerApplicationService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'created', ownerApplicationId: 'app-1' });
    });
  });

  describe('approve', () => {
    it('delegates to service.approve with applicationId', async () => {
      mockOwnerApplicationService.approve.mockResolvedValue({ message: 'approved' });

      const result = await controller.approve({ applicationId: 'app-1' });

      expect(mockOwnerApplicationService.approve).toHaveBeenCalledWith('app-1');
      expect(result).toEqual({ message: 'approved' });
    });
  });

  describe('reject', () => {
    it('delegates to service.reject with applicationId and data', async () => {
      const rejectDto = { reason: 'Incomplete docs' } as any;
      mockOwnerApplicationService.reject.mockResolvedValue({ message: 'rejected' });

      const result = await controller.reject({ applicationId: 'app-1', data: rejectDto });

      expect(mockOwnerApplicationService.reject).toHaveBeenCalledWith('app-1', rejectDto);
      expect(result).toEqual({ message: 'rejected' });
    });
  });
});
