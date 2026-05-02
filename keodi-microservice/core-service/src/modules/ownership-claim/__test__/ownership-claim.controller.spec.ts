import { Test, TestingModule } from '@nestjs/testing';
import { OwnershipClaimController } from '../ownership-claim.controller';
import { OwnershipClaimService } from '../ownership-claim.service';

const mockOwnershipClaimService = {
  create: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  getClaims: jest.fn(),
  getMyClaims: jest.fn(),
};

describe('OwnershipClaimController', () => {
  let controller: OwnershipClaimController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnershipClaimController],
      providers: [{ provide: OwnershipClaimService, useValue: mockOwnershipClaimService }],
    }).compile();

    controller = module.get<OwnershipClaimController>(OwnershipClaimController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create – delegates to service.create', async () => {
    const dto = { userId: 'u1', placeId: 'p1' } as any;
    mockOwnershipClaimService.create.mockResolvedValue({ claimId: 'claim-1' });

    await controller.create(dto);

    expect(mockOwnershipClaimService.create).toHaveBeenCalledWith(dto);
  });

  it('approve – delegates to service.approve with claimId', async () => {
    mockOwnershipClaimService.approve.mockResolvedValue({ message: 'approved' });

    await controller.approve({ claimId: 'claim-1' });

    expect(mockOwnershipClaimService.approve).toHaveBeenCalledWith('claim-1');
  });

  it('reject – delegates to service.reject with claimId and DTO', async () => {
    const rejectDto = { reason: 'Docs invalid' } as any;
    mockOwnershipClaimService.reject.mockResolvedValue({ message: 'rejected' });

    await controller.reject({ claimId: 'claim-1', data: rejectDto });

    expect(mockOwnershipClaimService.reject).toHaveBeenCalledWith('claim-1', rejectDto);
  });

  it('getClaims – delegates to service.getClaims with DTO', async () => {
    const dto = { page: 1, limit: 10, sortOrder: 'desc' } as any;
    mockOwnershipClaimService.getClaims.mockResolvedValue({ data: [] });

    await controller.getClaims(dto);

    expect(mockOwnershipClaimService.getClaims).toHaveBeenCalledWith(dto);
  });

  it('getMyClaims – delegates to service.getMyClaims with DTO', async () => {
    const dto = { userId: 'u1', page: 1, limit: 10, sortOrder: 'asc' } as any;
    mockOwnershipClaimService.getMyClaims.mockResolvedValue({ data: [] });

    await controller.getMyClaims(dto);

    expect(mockOwnershipClaimService.getMyClaims).toHaveBeenCalledWith(dto);
  });
});
